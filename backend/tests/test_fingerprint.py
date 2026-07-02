"""Tests for AI Model Fingerprinting module."""

from backend.app.services.fingerprint import model_fingerprinter
from backend.app.services.analyzers.base import ArtifactResult


def test_human_prediction():
    res = model_fingerprinter.predict(
        overall_score=15.0,
        artifacts=[],
        duration=30.0,
    )
    assert res.predicted_model == "Likely Human / Studio Production"
    assert res.confidence == "high"


def test_suno_prediction():
    artifacts = [
        ArtifactResult(
            name="spectral_checkerboard",
            detected=True,
            severity="high",
            value=0.8,
            description="Checkerboard pattern",
            probability=0.75,
            domain="spectral",
        ),
        ArtifactResult(
            name="crest_factor",
            detected=True,
            severity="medium",
            value=0.5,
            description="Soft saturation",
            probability=0.6,
            domain="production",
        )
    ]
    res = model_fingerprinter.predict(
        overall_score=85.0,
        artifacts=artifacts,
        duration=60.0,
        high_freq_cutoff_hz=16000.0,
    )
    assert "Suno" in res.predicted_model
    assert res.confidence_score > 0.3
    assert len(res.signature_traits) > 0


def test_udio_prediction():
    artifacts = [
        ArtifactResult(
            name="hf_harmonic_noise",
            detected=True,
            severity="high",
            value=0.8,
            description="HF Noise",
            probability=0.8,
            domain="spectral",
        ),
        ArtifactResult(
            name="bass_stereo_width",
            detected=True,
            severity="high",
            value=0.7,
            description="Wide bass",
            probability=0.7,
            domain="spatial",
        )
    ]
    res = model_fingerprinter.predict(
        overall_score=78.0,
        artifacts=artifacts,
        duration=45.0,
        high_freq_cutoff_hz=19500.0,
    )
    assert "Udio" in res.predicted_model
