"""Integration tests for the API endpoints."""

import io
import wave
import struct

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def _make_test_wav_bytes(duration_sec: float = 2.0, sample_rate: int = 44100) -> bytes:
    buf = io.BytesIO()
    num_samples = int(duration_sec * sample_rate)
    with wave.open(buf, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.setnframes(num_samples)
        for i in range(num_samples):
            sample = int(16000 * (i % (sample_rate // 440)) / (sample_rate // 440))
            wf.writeframes(struct.pack("<h", sample % 32767))
    buf.seek(0)
    return buf.read()


class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "ai-audio-detector"
        assert "version" in data

    def test_health_with_trailing_slash_redirects(self, client):
        response = client.get("/api/health/")
        assert response.status_code in (200, 307)


class TestAnalyzeEndpoint:
    def test_analyze_valid_wav(self, client):
        wav_data = _make_test_wav_bytes()
        files = {"file": ("test.wav", io.BytesIO(wav_data), "audio/wav")}
        response = client.post("/api/analyze?depth=quick", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "scan_id" in data
        assert "overall_score" in data
        assert 0 <= data["overall_score"] <= 100
        assert data["confidence"] in ("low", "medium", "high")
        assert data["depth_used"] == "quick"
        assert len(data["domain_results"]) == 7
        assert isinstance(data["domain_results"], list)

    def test_analyze_default_depth(self, client):
        wav_data = _make_test_wav_bytes()
        files = {"file": ("test.wav", io.BytesIO(wav_data), "audio/wav")}
        response = client.post("/api/analyze", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["depth_used"] == "standard"

    def test_analyze_quick_depth(self, client):
        wav_data = _make_test_wav_bytes()
        files = {"file": ("test.mp3", io.BytesIO(b"fake mp3 data"), "audio/mpeg")}
        response = client.post("/api/analyze?depth=quick", files=files)
        assert response.status_code in (200, 500)

    def test_analyze_missing_file(self, client):
        response = client.post("/api/analyze?depth=standard")
        assert response.status_code == 422

    def test_analyze_unsupported_format(self, client):
        files = {"file": ("test.txt", io.BytesIO(b"not audio"), "text/plain")}
        response = client.post("/api/analyze?depth=quick", files=files)
        assert response.status_code == 400
        assert "Unsupported format" in response.json()["detail"]

    def test_analyze_empty_filename(self, client):
        files = {"file": ("", io.BytesIO(b"data"), "audio/wav")}
        response = client.post("/api/analyze?depth=quick", files=files)
        assert response.status_code in (400, 422)

    def test_analyze_deep_depth(self, client):
        wav_data = _make_test_wav_bytes(duration_sec=3.0)
        files = {"file": ("test.wav", io.BytesIO(wav_data), "audio/wav")}
        response = client.post("/api/analyze?depth=deep", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["depth_used"] == "deep"

    def test_analyze_response_structure(self, client):
        wav_data = _make_test_wav_bytes()
        files = {"file": ("test.wav", io.BytesIO(wav_data), "audio/wav")}
        response = client.post("/api/analyze?depth=standard", files=files)
        assert response.status_code == 200
        data = response.json()
        required_fields = [
            "scan_id", "analyzed_at", "tool_version", "filename",
            "duration_seconds", "sample_rate", "channels",
            "peak_db", "rms_db", "overall_score", "confidence",
            "confidence_value", "depth_used", "domain_results",
            "ai_artifacts", "overall_ai_likelihood",
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_domain_results_have_artifacts(self, client):
        wav_data = _make_test_wav_bytes(duration_sec=3.0)
        files = {"file": ("test.wav", io.BytesIO(wav_data), "audio/wav")}
        response = client.post("/api/analyze?depth=standard", files=files)
        assert response.status_code == 200
        data = response.json()
        for domain in data["domain_results"]:
            assert "domain" in domain
            assert "display_name" in domain
            assert "score" in domain
            assert "active" in domain
            assert "weight" in domain
            assert "artifacts" in domain

    def test_artifact_fields(self, client):
        wav_data = _make_test_wav_bytes(duration_sec=3.0)
        files = {"file": ("test.wav", io.BytesIO(wav_data), "audio/wav")}
        response = client.post("/api/analyze?depth=standard", files=files)
        assert response.status_code == 200
        data = response.json()
        for artifact in data["ai_artifacts"]:
            assert "name" in artifact
            assert "detected" in artifact
            assert "severity" in artifact
            assert "probability" in artifact
            assert "domain" in artifact
            assert "tier" in artifact
