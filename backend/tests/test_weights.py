"""Tests for weight configuration."""

import pytest
from backend.app.services.analyzers import weights


class TestDomainWeights:
    def test_weights_sum_to_one(self):
        total = sum(c.base_weight for c in weights.DOMAIN_WEIGHTS.values())
        assert abs(total - 1.0) < 0.001, f"Domain weights sum to {total}, expected 1.0"

    def test_all_seven_domains_present(self):
        expected = {"spectral", "temporal", "spatial", "structural", "production", "vocal", "watermark"}
        assert set(weights.DOMAIN_WEIGHTS.keys()) == expected

    def test_get_domain_base_weight_known(self):
        assert weights.get_domain_base_weight("spectral") > 0

    def test_get_domain_base_weight_unknown(self):
        assert weights.get_domain_base_weight("nonexistent") == 0.0


class TestArtifactWeights:
    def test_get_artifact_weight_known(self):
        assert weights.get_artifact_weight("checkerboard_artifacts") == 5.0

    def test_get_artifact_weight_unknown(self):
        assert weights.get_artifact_weight("nonexistent") == 1.0

    def test_get_artifact_tier_known(self):
        assert weights.get_artifact_tier("audioseal_watermark") == 1  # DEFINITIVE

    def test_get_artifact_tier_unknown(self):
        assert weights.get_artifact_tier("nonexistent") == 3  # MODERATE default

    def test_all_tier_one_artifacts(self):
        tier_ones = {k for k, v in weights.ARTIFACT_WEIGHTS.items() if int(v.tier) == 1}
        assert "audioseal_watermark" in tier_ones
        assert "loudness_range" in tier_ones
