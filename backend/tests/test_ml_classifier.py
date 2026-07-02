"""Tests for ML Random Forest Classifier."""

import pytest
import numpy as np
from backend.app.services.ml_classifier import AudioMLClassifier, AudioFeatureExtractor


def test_feature_extractor():
    extractor = AudioFeatureExtractor()
    sr = 22050
    # 2 seconds synthetic audio
    y = np.random.randn(sr * 2).astype(np.float32)

    vec = extractor.extract_features(y, sr)
    assert len(vec) == 24
    assert isinstance(vec[0], (float, np.floating))


def test_ml_classifier_predict():
    clf = AudioMLClassifier()
    sr = 22050
    y = np.random.randn(sr * 2).astype(np.float32)

    ai_prob, summary = clf.predict_ai_probability(y, sr)
    assert 0.0 <= ai_prob <= 1.0
    assert "ml_ai_probability" in summary
