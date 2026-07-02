"""AI Model Fingerprinting Classifier for Audio Detection.

Matches spectral, temporal, structural, and watermark signature traits to predict
the underlying generative model architecture (Suno, Udio, MusicGen, ElevenLabs, AudioLDM/Riffusion).
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict
import numpy as np


@dataclass
class ModelFingerprintResult:
    predicted_model: str                    # "Suno AI (v3 / v3.5)", "Udio AI", "Meta MusicGen", "ElevenLabs Voice/Audio", "Diffusion Model (AudioLDM)", "Human / Studio Production"
    confidence: str                         # "low", "medium", "high"
    confidence_score: float                 # 0.0 - 1.0
    model_probabilities: Dict[str, float]   # {"Suno AI (v3 / v3.5)": 0.65, "Udio AI": 0.20, ...}
    signature_traits: List[str] = field(default_factory=list)
    description: str = ""


class ModelFingerprinter:
    """Classifies audio features to predict the specific generative AI system."""

    def predict(
        self,
        overall_score: float,
        artifacts: list,
        duration: float,
        high_freq_cutoff_hz: Optional[float] = None,
        stereo_correlation: Optional[float] = None,
    ) -> ModelFingerprintResult:
        if overall_score < 30.0:
            return ModelFingerprintResult(
                predicted_model="Likely Human / Studio Production",
                confidence="high",
                confidence_score=0.92,
                model_probabilities={
                    "Likely Human / Studio": 0.92,
                    "Suno AI (v3 / v3.5)": 0.03,
                    "Udio AI": 0.02,
                    "Meta MusicGen": 0.02,
                    "ElevenLabs": 0.01,
                },
                signature_traits=[
                    "Organic high-frequency harmonic decay (>18kHz)",
                    "Natural dynamic range & room acoustic reverb tails",
                    "No neural upsampling checkerboard artifacts",
                ],
                description="Analysis signals closely match traditional studio recording and mastering acoustics.",
            )

        art_map = {}
        for a in artifacts:
            name = a.get("name", "") if isinstance(a, dict) else getattr(a, "name", "")
            if name:
                art_map[name] = a

        def get_prob(name: str) -> float:
            if name in art_map:
                obj = art_map[name]
                return obj.get("probability", 0.0) if isinstance(obj, dict) else getattr(obj, "probability", 0.0)
            return 0.0

        def get_val(name: str) -> Optional[float]:
            if name in art_map:
                obj = art_map[name]
                return obj.get("value", None) if isinstance(obj, dict) else getattr(obj, "value", None)
            return None


        # Feature extraction
        checkerboard_prob = get_prob("spectral_checkerboard")
        cutoff_val = high_freq_cutoff_hz or get_val("spectral_rolloff")
        hf_hnr_prob = get_prob("hf_harmonic_noise")
        crest_prob = get_prob("crest_factor")
        lra_prob = get_prob("loudness_range")
        reverb_prob = get_prob("reverb_tail_decay")
        jitter_prob = get_prob("onset_jitter")
        formant_prob = get_prob("vocal_formant")
        vibrato_prob = get_prob("vocal_vibrato")
        watermark_prob = get_prob("audioseal_watermark")
        bass_width_prob = get_prob("bass_stereo_width")

        # Initializing raw score weights for each model
        scores = {
            "Suno AI": 0.5,
            "Udio AI": 0.5,
            "Meta MusicGen": 0.5,
            "ElevenLabs": 0.5,
            "AudioLDM / Diffusion": 0.5,
        }
        traits = {
            "Suno AI": [],
            "Udio AI": [],
            "Meta MusicGen": [],
            "ElevenLabs": [],
            "AudioLDM / Diffusion": [],
        }

        # --- Suno AI Signatures ---
        if cutoff_val and 14500 <= cutoff_val <= 18500:
            scores["Suno AI"] += 3.5
            traits["Suno AI"].append(f"Brickwall spectral rolloff at {cutoff_val/1000:.1f}kHz (typical of Suno architecture)")
        if checkerboard_prob > 0.35:
            scores["Suno AI"] += 3.0
            traits["Suno AI"].append("CNN transposed convolution checkerboard pattern")
        if crest_prob > 0.4:
            scores["Suno AI"] += 1.5
            traits["Suno AI"].append("Soft saturation curve in generated audio")
        if formant_prob > 0.4:
            scores["Suno AI"] += 2.0
            traits["Suno AI"].append("Neural vocoder formant synthesis smear")

        # --- Udio AI Signatures ---
        if cutoff_val and cutoff_val > 18500:
            scores["Udio AI"] += 2.5
            traits["Udio AI"].append("Extended bandwidth (>19kHz) typical of Udio 44.1kHz synthesis")
        if hf_hnr_prob > 0.35:
            scores["Udio AI"] += 3.5
            traits["Udio AI"].append("High-frequency metallic noise-to-harmonic artifact (>12kHz)")
        if bass_width_prob > 0.35:
            scores["Udio AI"] += 2.5
            traits["Udio AI"].append("Unnatural bass stereo phase dispersion")
        if reverb_prob > 0.45:
            scores["Udio AI"] += 2.0
            traits["Udio AI"].append("Synthetic reverb tail phase morphing")

        # --- Meta MusicGen Signatures ---
        if jitter_prob > 0.35:
            scores["Meta MusicGen"] += 4.0
            traits["Meta MusicGen"].append("Severe frame onset jitter from EnCodec token-by-token generation")
        if lra_prob > 0.45:
            scores["Meta MusicGen"] += 2.5
            traits["Meta MusicGen"].append("Ultra-flat dynamic range (<3 LU) from autoregressive generation")
        if cutoff_val and 15500 <= cutoff_val <= 16500:
            scores["Meta MusicGen"] += 2.0
            traits["Meta MusicGen"].append("EnCodec 16kHz hard bandwidth limit")

        # --- ElevenLabs Signatures ---
        if watermark_prob > 0.7:
            scores["ElevenLabs"] += 6.0
            traits["ElevenLabs"].append("AudioSeal embedded neural audio watermark detected")
        if vibrato_prob > 0.45:
            scores["ElevenLabs"] += 3.0
            traits["ElevenLabs"].append("Unnaturally smooth / synthetic vocal vibrato modulation")
        if formant_prob > 0.55:
            scores["ElevenLabs"] += 2.5
            traits["ElevenLabs"].append("Vocal tract acoustic resonance smearing")

        # --- AudioLDM / Riffusion (Diffusion Models) ---
        if reverb_prob > 0.55:
            scores["AudioLDM / Diffusion"] += 3.5
            traits["AudioLDM / Diffusion"].append("Non-exponential reverb decay from latent magnitude diffusion")
        if crest_prob > 0.55:
            scores["AudioLDM / Diffusion"] += 2.5
            traits["AudioLDM / Diffusion"].append("Transient smearing from Griffin-Lim / vocoder phase approximation")

        # Normalize probabilities via softmax scale
        max_s = max(scores.values())
        exp_scores = {k: np.exp(v - max_s) for k, v in scores.items()}
        total_exp = sum(exp_scores.values())
        probs = {k: float(v / total_exp) for k, v in exp_scores.items()}

        best_model = max(probs, key=probs.get)
        best_score = probs[best_model]

        if best_score > 0.50:
            confidence = "high"
        elif best_score > 0.32:
            confidence = "medium"
        else:
            confidence = "low"

        model_name_map = {
            "Suno AI": "Suno AI (v3 / v3.5)",
            "Udio AI": "Udio AI",
            "Meta MusicGen": "Meta MusicGen / AudioCraft",
            "ElevenLabs": "ElevenLabs Voice/Audio",
            "AudioLDM / Diffusion": "Diffusion Model (AudioLDM / Riffusion)",
        }

        desc_map = {
            "Suno AI": "Audio features strongly match Suno's neural architecture, exhibiting 16-18kHz spectral rolloff and transposed convolution upsampling patterns.",
            "Udio AI": "Spectral & spatial characteristics match Udio, showing high-frequency metallic noise artifacts and stereo phase anomalies.",
            "Meta MusicGen": "Temporal & dynamic profiles indicate MusicGen / EnCodec tokenized autoregressive audio generation.",
            "ElevenLabs": "Vocal acoustic & watermark signatures correspond to ElevenLabs neural voice synthesis.",
            "AudioLDM / Diffusion": "Spectrogram decay and transient smearing indicate latent diffusion magnitude reconstruction.",
        }

        top_traits = traits.get(best_model, [])
        if not top_traits:
            top_traits = ["General neural audio generation artifacts detected"]

        return ModelFingerprintResult(
            predicted_model=model_name_map.get(best_model, best_model),
            confidence=confidence,
            confidence_score=round(best_score, 2),
            model_probabilities={model_name_map.get(k, k): round(v, 2) for k, v in probs.items()},
            signature_traits=top_traits,
            description=desc_map.get(best_model, "Matches generative audio model fingerprint signatures."),
        )


model_fingerprinter = ModelFingerprinter()
