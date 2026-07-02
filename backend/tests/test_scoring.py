"""Tests for the weighted scoring engine."""

from backend.app.services.analyzers.base import ArtifactResult, DomainResult
from backend.app.services.analyzers.scoring import WeightedScoringEngine


def _make_domain(domain: str, score: float, active: bool = True, weight: float = 0.1, artifacts: list | None = None) -> DomainResult:
    return DomainResult(
        domain=domain,
        display_name=domain.title(),
        score=score,
        active=active,
        weight=weight,
        artifacts=artifacts or [],
    )


class TestWeightedScoringEngine:
    def test_empty_input(self):
        engine = WeightedScoringEngine()
        result = engine.calculate([])
        assert result.overall_score == 0.0
        assert result.confidence == "low"
        assert result.overall_likelihood == "unknown"

    def test_all_inactive(self):
        engine = WeightedScoringEngine()
        domains = [
            _make_domain("spectral", 0.0, active=False, weight=0.4),
            _make_domain("temporal", 0.0, active=False, weight=0.1),
        ]
        result = engine.calculate(domains)
        assert result.overall_score == 0.0
        assert result.confidence == "low"

    def test_single_active_low_score(self):
        engine = WeightedScoringEngine()
        domains = [
            _make_domain("spectral", 0.05, active=True, weight=0.4),
            _make_domain("temporal", 0.0, active=False, weight=0.1),
        ]
        result = engine.calculate(domains)
        assert result.overall_score <= 20
        assert result.overall_likelihood == "unlikely"

    def test_single_active_high_score(self):
        engine = WeightedScoringEngine()
        domains = [
            _make_domain("spectral", 0.8, active=True, weight=0.4),
            _make_domain("temporal", 0.0, active=False, weight=0.1),
        ]
        result = engine.calculate(domains)
        assert result.overall_score > 50
        assert result.overall_likelihood in ("possible", "likely")

    def test_multiple_concordant_domains(self):
        engine = WeightedScoringEngine()
        domains = [
            _make_domain("spectral", 0.6, active=True, weight=0.4),
            _make_domain("production", 0.5, active=True, weight=0.15),
            _make_domain("spatial", 0.1, active=True, weight=0.1),
        ]
        result = engine.calculate(domains)
        assert result.overall_score > 45

    def test_evidence_gate_suppresses_near_zero(self):
        engine = WeightedScoringEngine()
        domains = [
            _make_domain("spectral", 0.001, active=True, weight=0.4),
            _make_domain("production", 0.002, active=True, weight=0.15),
        ]
        result = engine.calculate(domains)
        assert result.overall_score < 10

    def test_watermark_override(self):
        engine = WeightedScoringEngine()
        domains = [
            _make_domain("spectral", 0.1, active=True, weight=0.4),
            _make_domain("watermark", 0.95, active=True, weight=0.1),
        ]
        result = engine.calculate(domains)
        assert result.overall_score >= 95.0
        assert result.confidence == "high"

    def test_score_bounds(self):
        engine = WeightedScoringEngine()
        for score_val in [0.0, 0.5, 1.0]:
            domains = [_make_domain("spectral", score_val, active=True, weight=1.0)]
            result = engine.calculate(domains)
            assert 0 <= result.overall_score <= 100


class TestArtifactResult:
    def test_artifact_properties(self):
        a = ArtifactResult(
            name="test_artifact",
            detected=True,
            severity="medium",
            value=42.0,
            description="Test",
            probability=0.75,
            domain="spectral",
            weight=3.0,
            tier=2,
        )
        assert a.detected is True
        assert a.probability == 0.75
        assert a.tier == 2
        assert a.severity == "medium"


class TestDomainResult:
    def test_domain_properties(self):
        artifacts = [
            ArtifactResult(
                name="checkerboard",
                detected=True,
                severity="medium",
                value=3.5,
                description="Test",
                probability=0.6,
                domain="spectral",
                weight=5.0,
                tier=3,
            ),
        ]
        d = DomainResult(
            domain="spectral",
            display_name="Spectral",
            score=0.6,
            active=True,
            weight=0.4,
            artifacts=artifacts,
        )
        assert d.domain == "spectral"
        assert d.score == 0.6
        assert len(d.artifacts) == 1
