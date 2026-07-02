"""Audio analysis API endpoints."""

import asyncio
import logging
import tempfile
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import hashlib
import json
import aiofiles
from fastapi import APIRouter, HTTPException, File, UploadFile, Query, BackgroundTasks, Request
from fastapi.responses import StreamingResponse

from ..config import APP_VERSION, settings
from ..models.schemas import (
    AnalysisDepth,
    AnalysisResponse,
    AIArtifactIndicator,
    DomainAnalysisResult,
)
from ..services.audio_analyzer import audio_analyzer
from ..services.cache import cache_manager


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])

SUPPORTED_FORMATS = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".wma"}

_executor = ThreadPoolExecutor(max_workers=2)


_rate_limit_buckets: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(client_ip: str) -> None:
    if not settings.rate_limit_enabled:
        return
    now = time.time()
    window = settings.rate_limit_window_seconds
    bucket = _rate_limit_buckets[client_ip]
    bucket[:] = [t for t in bucket if now - t < window]
    if len(bucket) >= settings.rate_limit_max_requests:
        retry_after = int(window - (now - bucket[0]))
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )
    bucket.append(now)


def _cleanup_temp_file(file_path: Path):
    try:
        if file_path.exists():
            file_path.unlink()
    except Exception:
        pass


def _run_analysis(temp_path: Path, depth_value: str) -> dict:
    return audio_analyzer.analyze_file(audio_path=temp_path, depth=depth_value)


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(
    request: Request,
    file: UploadFile = File(...),
    depth: AnalysisDepth = Query(default=AnalysisDepth.STANDARD),
    background_tasks: BackgroundTasks = None,
):
    """Upload an audio file and analyze it for AI generation indicators.

    **Depth levels:**
    - `quick` (~3-5s): Spectral + spatial + production (basic)
    - `standard` (~10-15s): + temporal + production (reverb)
    - `deep` (~30-45s): + structural + vocal + watermark

    Supports: WAV, MP3, FLAC, OGG, M4A, AAC, WMA
    """
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Supported: {', '.join(sorted(SUPPORTED_FORMATS))}",
        )

    max_bytes = settings.max_file_size_mb * 1024 * 1024
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.max_file_size_mb}MB",
        )

    temp_dir = Path(tempfile.gettempdir()) / "ai-audio-detector"
    temp_dir.mkdir(exist_ok=True)

    temp_filename = f"{uuid4()}_{file.filename}"
    temp_path = temp_dir / temp_filename

    try:
        content = await file.read()
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum size of {settings.max_file_size_mb}MB",
            )

        sha256_hash = hashlib.sha256(content).hexdigest()

        # Check SQLite Cache
        cached_data = cache_manager.get(sha256_hash, depth.value)
        if cached_data:
            cached_data["filename"] = file.filename
            cached_data["scan_id"] = str(uuid4())
            cached_data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
            return AnalysisResponse(**cached_data)

        async with aiofiles.open(temp_path, "wb") as f:
            await f.write(content)

        loop = asyncio.get_running_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(_executor, _run_analysis, temp_path, depth.value),
                timeout=settings.analysis_timeout_seconds,
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=500,
                detail=f"Analysis timed out after {settings.analysis_timeout_seconds}s",
            )

        response = AnalysisResponse(
            scan_id=str(uuid4()),
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            tool_version=APP_VERSION,
            filename=result["filename"],
            duration_seconds=result["duration_seconds"],
            sample_rate=result["sample_rate"],
            channels=result["channels"],
            peak_db=result["peak_db"],
            rms_db=result["rms_db"],
            overall_score=result["overall_score"],
            confidence=result["confidence"],
            confidence_value=result["confidence_value"],
            depth_used=result["depth_used"],
            domain_results=[
                DomainAnalysisResult(
                    domain=d["domain"],
                    display_name=d["display_name"],
                    score=d["score"],
                    active=d["active"],
                    weight=d["weight"],
                    artifacts=[
                        AIArtifactIndicator(**a) for a in d.get("artifacts", [])
                    ],
                )
                for d in result.get("domain_results", [])
            ],
            ai_artifacts=[
                AIArtifactIndicator(**a) for a in result.get("ai_artifacts", [])
            ],
            overall_ai_likelihood=result.get("overall_ai_likelihood", "unknown"),
            high_freq_cutoff_hz=result.get("high_freq_cutoff_hz"),
            stereo_correlation=result.get("stereo_correlation"),
            model_fingerprint=result.get("model_fingerprint"),
        )

        # Save to SQLite Cache
        cache_manager.set(sha256_hash, depth.value, response.model_dump())

        return response


    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")
    finally:
        if background_tasks:
            background_tasks.add_task(_cleanup_temp_file, temp_path)
        else:
            _cleanup_temp_file(temp_path)


@router.post("/analyze-stream")
async def analyze_audio_stream(
    request: Request,
    file: UploadFile = File(...),
    depth: AnalysisDepth = Query(default=AnalysisDepth.STANDARD),
):
    """Analyze audio file with real-time NDJSON streaming progress events.

    Yields JSON chunks:
    - `{"type": "progress", "percent": N, "message": "..."}`
    - `{"type": "result", "data": {...}}`
    """
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Supported: {', '.join(sorted(SUPPORTED_FORMATS))}",
        )

    max_bytes = settings.max_file_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.max_file_size_mb}MB",
        )

    sha256_hash = hashlib.sha256(content).hexdigest()

    async def event_generator():
        # 1. Check cache first
        cached_data = cache_manager.get(sha256_hash, depth.value)
        if cached_data:
            cached_data["filename"] = file.filename
            cached_data["scan_id"] = str(uuid4())
            cached_data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
            yield json.dumps({"type": "progress", "percent": 50, "message": "Cache hit! Loading stored analysis..."}) + "\n"
            await asyncio.sleep(0.1)
            yield json.dumps({"type": "progress", "percent": 100, "message": "Analysis complete!"}) + "\n"
            yield json.dumps({"type": "result", "data": cached_data}) + "\n"
            return

        temp_dir = Path(tempfile.gettempdir()) / "ai-audio-detector"
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / f"{uuid4()}_{file.filename}"

        try:
            async with aiofiles.open(temp_path, "wb") as f:
                await f.write(content)

            queue = asyncio.Queue()
            loop = asyncio.get_running_loop()

            def on_progress(pct: int, msg: str):
                loop.call_soon_threadsafe(queue.put_nowait, (pct, msg))

            async def run_in_thread():
                return await loop.run_in_executor(
                    _executor,
                    audio_analyzer.analyze_file,
                    temp_path,
                    depth.value,
                    on_progress,
                )

            analysis_task = asyncio.create_task(run_in_thread())

            while not analysis_task.done() or not queue.empty():
                try:
                    pct, msg = await asyncio.wait_for(queue.get(), timeout=0.2)
                    yield json.dumps({"type": "progress", "percent": pct, "message": msg}) + "\n"
                except asyncio.TimeoutError:
                    pass

            result = await analysis_task

            response_data = AnalysisResponse(
                scan_id=str(uuid4()),
                analyzed_at=datetime.now(timezone.utc).isoformat(),
                tool_version=APP_VERSION,
                filename=result["filename"],
                duration_seconds=result["duration_seconds"],
                sample_rate=result["sample_rate"],
                channels=result["channels"],
                peak_db=result["peak_db"],
                rms_db=result["rms_db"],
                overall_score=result["overall_score"],
                confidence=result["confidence"],
                confidence_value=result["confidence_value"],
                depth_used=result["depth_used"],
                domain_results=[
                    DomainAnalysisResult(
                        domain=d["domain"],
                        display_name=d["display_name"],
                        score=d["score"],
                        active=d["active"],
                        weight=d["weight"],
                        artifacts=[
                            AIArtifactIndicator(**a) for a in d.get("artifacts", [])
                        ],
                    )
                    for d in result.get("domain_results", [])
                ],
                ai_artifacts=[
                    AIArtifactIndicator(**a) for a in result.get("ai_artifacts", [])
                ],
                overall_ai_likelihood=result.get("overall_ai_likelihood", "unknown"),
                high_freq_cutoff_hz=result.get("high_freq_cutoff_hz"),
                stereo_correlation=result.get("stereo_correlation"),
                model_fingerprint=result.get("model_fingerprint"),
            ).model_dump()

            # Save to SQLite Cache
            cache_manager.set(sha256_hash, depth.value, response_data)

            yield json.dumps({"type": "progress", "percent": 100, "message": "Analysis complete!"}) + "\n"
            yield json.dumps({"type": "result", "data": response_data}) + "\n"

        except Exception as e:
            logger.exception("Streaming analysis failed")
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"
        finally:
            _cleanup_temp_file(temp_path)

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ai-audio-detector", "version": APP_VERSION}

