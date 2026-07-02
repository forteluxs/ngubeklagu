import numpy as np
import pytest


@pytest.fixture
def simple_mono_audio():
    sr = 44100
    t = np.linspace(0, 5, sr * 5, endpoint=False)
    y = 0.5 * np.sin(2 * np.pi * 440 * t)
    return y, sr


@pytest.fixture
def simple_stereo_audio():
    sr = 44100
    t = np.linspace(0, 5, sr * 5, endpoint=False)
    left = 0.5 * np.sin(2 * np.pi * 440 * t)
    right = 0.4 * np.sin(2 * np.pi * 554 * t)
    return np.vstack([left, right]), sr
