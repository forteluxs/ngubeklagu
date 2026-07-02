"""Tests for SQLite Cache Manager."""

import json
import pytest
from backend.app.services.cache import CacheManager


def test_cache_set_and_get(tmp_path):
    db_file = tmp_path / "test_cache.db"
    cache = CacheManager(db_path=db_file)

    sample_hash = "abc123def456"
    depth = "standard"
    sample_result = {
        "filename": "song.mp3",
        "overall_score": 88.5,
        "overall_ai_likelihood": "likely",
    }

    cache.set(sample_hash, depth, sample_result)

    retrieved = cache.get(sample_hash, depth)
    assert retrieved is not None
    assert retrieved["cached"] is True
    assert retrieved["overall_score"] == 88.5
    assert retrieved["filename"] == "song.mp3"


def test_cache_miss(tmp_path):
    db_file = tmp_path / "test_cache.db"
    cache = CacheManager(db_path=db_file)

    retrieved = cache.get("nonexistent_hash", "standard")
    assert retrieved is None
