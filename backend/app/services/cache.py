"""SQLite Cache Manager for Audio Analysis.

Caches analysis results by SHA-256 checksum and depth to eliminate redundant processing.
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent.parent / "data" / "cache.db"


class CacheManager:
    """SQLite-backed persistent cache for audio analysis scans."""

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        try:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS scan_cache (
                        cache_key TEXT PRIMARY KEY,
                        sha256 TEXT NOT NULL,
                        depth TEXT NOT NULL,
                        result_json TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                    """
                )
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_sha256 ON scan_cache (sha256);"
                )
                conn.commit()
        except Exception as e:
            logger.error("Failed to initialize SQLite cache db: %s", e)

    def get(self, sha256_hash: str, depth: str) -> Optional[Dict[str, Any]]:
        cache_key = f"{sha256_hash}_{depth}"
        try:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT result_json FROM scan_cache WHERE cache_key = ?",
                    (cache_key,),
                )
                row = cursor.fetchone()
                if row:
                    data = json.loads(row["result_json"])
                    data["cached"] = True
                    logger.info("Cache HIT for SHA256 %s (depth=%s)", sha256_hash[:8], depth)
                    return data
        except Exception as e:
            logger.error("Cache read error: %s", e)
        return None

    def set(self, sha256_hash: str, depth: str, result: Dict[str, Any]):
        cache_key = f"{sha256_hash}_{depth}"
        try:
            # Create a serializable copy without cached flag
            clean_result = {k: v for k, v in result.items() if k != "cached"}
            clean_result["cached"] = False
            json_str = json.dumps(clean_result)
            now_iso = datetime.now(timezone.utc).isoformat()

            with self._get_connection() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO scan_cache (cache_key, sha256, depth, result_json, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (cache_key, sha256_hash, depth, json_str, now_iso),
                )
                conn.commit()
                logger.info("Cached result saved for SHA256 %s (depth=%s)", sha256_hash[:8], depth)
        except Exception as e:
            logger.error("Cache write error: %s", e)


cache_manager = CacheManager()
