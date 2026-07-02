"""Machine Learning Classifier (Random Forest) for AI Audio Detection.

Inspired by SubmitHub's Random Forest classifier architecture.
Extracts multi-feature acoustic vectors (spectral centroid, bandwidth, rolloff,
flatness, MFCCs, zero-crossing rate, HF energy ratios) and uses a trained
Random Forest model to predict AI vs Human probability.
"""

import logging
import numpy as np
import librosa
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


class AudioFeatureExtractor:
    """Extracts a 24-dimensional acoustic feature vector from audio signals."""

    def extract_features(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Extract acoustic feature vector from mono audio signal."""
        if len(y) == 0:
            return np.zeros(24)

        # 1. Spectral Centroid
        cent = librosa.feature.spectral_centroid(y=y, sr=sr)
        cent_mean = float(np.mean(cent))
        cent_std = float(np.std(cent))

        # 2. Spectral Rolloff (85% and 95%)
        rolloff_85 = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
        rolloff_95 = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.95)
        rf85_mean = float(np.mean(rolloff_85))
        rf95_mean = float(np.mean(rolloff_95))

        # 3. Spectral Bandwidth
        bw = librosa.feature.spectral_bandwidth(y=y, sr=sr)
        bw_mean = float(np.mean(bw))
        bw_std = float(np.std(bw))

        # 4. Spectral Flatness
        flat = librosa.feature.spectral_flatness(y=y)
        flat_mean = float(np.mean(flat))
        flat_std = float(np.std(flat))

        # 5. Zero Crossing Rate
        zcr = librosa.feature.zero_crossing_rate(y)
        zcr_mean = float(np.mean(zcr))
        zcr_std = float(np.std(zcr))

        # 6. RMS Dynamics & Crest Factor
        rms = librosa.feature.rms(y=y)
        rms_mean = float(np.mean(rms))
        peak = float(np.max(np.abs(y))) + 1e-10
        crest_factor = 20.0 * np.log10(peak / (rms_mean + 1e-10))

        # 7. High Frequency Energy Ratios (>12kHz and >15kHz)
        nyquist = sr / 2.0
        S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
        total_energy = np.sum(S) + 1e-10
        
        hf12_mask = freqs >= 12000
        hf15_mask = freqs >= 15000
        hf12_ratio = float(np.sum(S[hf12_mask, :]) / total_energy) if nyquist >= 12000 else 0.0
        hf15_ratio = float(np.sum(S[hf15_mask, :]) / total_energy) if nyquist >= 15000 else 0.0

        # 8. MFCCs (1 to 10)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=10)
        mfcc_means = [float(np.mean(m)) for m in mfccs]

        vector = [
            cent_mean, cent_std,
            rf85_mean, rf95_mean,
            bw_mean, bw_std,
            flat_mean, flat_std,
            zcr_mean, zcr_std,
            rms_mean, crest_factor,
            hf12_ratio, hf15_ratio,
            *mfcc_means,
        ]
        return np.array(vector[:24], dtype=np.float32)


class AudioMLClassifier:
    """Machine Learning Random Forest Classifier trained on AI vs Human audio features."""

    def __init__(self):
        self.extractor = AudioFeatureExtractor()
        self.scaler = StandardScaler()
        self.clf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
        self._is_trained = False
        self._init_synthetic_model()

    def _init_synthetic_model(self):
        """Train Random Forest classifier on synthetic dataset reflecting AI vs Human distributions.
        
        Human audio: wide dynamics, full bandwidth, natural spectral decay, continuous HF noise.
        AI audio (Suno/Udio): brickwall cutoff at 15.5-16.5kHz, low crest factor, high HF HNR, metallic artifacts.
        """
        np.random.seed(42)
        n_samples = 600

        # Feature layout (24 features):
        # 0: cent_mean, 1: cent_std, 2: rf85, 3: rf95, 4: bw_mean, 5: bw_std,
        # 6: flat_mean, 7: flat_std, 8: zcr_mean, 9: zcr_std, 10: rms_mean, 11: crest_factor,
        # 12: hf12_ratio, 13: hf15_ratio, 14-23: mfccs

        X_human = []
        X_ai = []

        for _ in range(n_samples // 2):
            # Human signatures
            rf95 = np.random.uniform(18000, 22000)
            rf85 = np.random.uniform(14000, 18000)
            hf15 = np.random.uniform(0.05, 0.20)
            crest = np.random.uniform(7.0, 14.0)
            flat = np.random.uniform(0.01, 0.08)
            zcr = np.random.uniform(0.04, 0.12)
            mfccs = np.random.normal(0, 10, 10)
            h_vec = [
                np.random.uniform(3000, 6000), np.random.uniform(1000, 2500),
                rf85, rf95,
                np.random.uniform(2500, 4500), np.random.uniform(500, 1500),
                flat, np.random.uniform(0.005, 0.03),
                zcr, np.random.uniform(0.01, 0.05),
                np.random.uniform(0.05, 0.25), crest,
                np.random.uniform(0.10, 0.30), hf15,
                *mfccs,
            ]
            X_human.append(h_vec[:24])

            # AI signatures (Suno/Udio)
            rf95_ai = np.random.uniform(14500, 17200) # Brickwall cutoff
            rf85_ai = np.random.uniform(11000, 15000)
            hf15_ai = np.random.uniform(0.001, 0.03)   # Cutoff above 15kHz
            crest_ai = np.random.uniform(3.0, 6.5)     # Compressed dynamics
            flat_ai = np.random.uniform(0.001, 0.02)
            zcr_ai = np.random.uniform(0.01, 0.06)
            mfccs_ai = np.random.normal(2, 8, 10)
            ai_vec = [
                np.random.uniform(1800, 3800), np.random.uniform(400, 1200),
                rf85_ai, rf95_ai,
                np.random.uniform(1500, 3200), np.random.uniform(200, 800),
                flat_ai, np.random.uniform(0.001, 0.01),
                zcr_ai, np.random.uniform(0.005, 0.02),
                np.random.uniform(0.10, 0.35), crest_ai,
                np.random.uniform(0.01, 0.08), hf15_ai,
                *mfccs_ai,
            ]
            X_ai.append(ai_vec[:24])

        X = np.vstack([X_human, X_ai])
        y = np.array([0] * len(X_human) + [1] * len(X_ai))

        X_scaled = self.scaler.fit_transform(X)
        self.clf.fit(X_scaled, y)
        self._is_trained = True
        logger.info("AudioMLClassifier trained successfully on Random Forest dataset.")

    def predict_ai_probability(self, y_mono: np.ndarray, sr: int) -> Tuple[float, Dict[str, Any]]:
        """Predict probability of audio being AI-generated using Random Forest.

        Returns:
            Tuple of (ai_probability_0_to_1, feature_summary_dict)
        """
        if not self._is_trained:
            self._init_synthetic_model()

        try:
            feats = self.extractor.extract_features(y_mono, sr)
            feats_scaled = self.scaler.transform([feats])
            probs = self.clf.predict_proba(feats_scaled)[0]
            ai_prob = float(probs[1]) # Index 1 is AI class probability

            summary = {
                "ml_ai_probability": round(ai_prob, 3),
                "spectral_rolloff_95_hz": round(float(feats[3]), 1),
                "crest_factor_db": round(float(feats[11]), 1),
                "hf15_energy_ratio": round(float(feats[13]), 4),
            }
            return ai_prob, summary
        except Exception as e:
            logger.warning("ML prediction failed: %s", e)
            return 0.5, {"error": str(e)}


# Global singleton instance
ml_classifier = AudioMLClassifier()
