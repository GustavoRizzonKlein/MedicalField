from contextlib import contextmanager
from pathlib import Path

import pymysql

from . import config

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


@contextmanager
def connection():
    conn = pymysql.connect(**config.DB, autocommit=True, cursorclass=pymysql.cursors.DictCursor)
    try:
        yield conn
    finally:
        conn.close()


def migrate() -> None:
    """Applies each file in /migrations once, in name order (same idea as Flyway)."""
    with connection() as conn, conn.cursor() as cursor:
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS schema_migrations (
                   version VARCHAR(100) PRIMARY KEY,
                   applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
               )"""
        )
        cursor.execute("SELECT version FROM schema_migrations")
        applied = {row["version"] for row in cursor.fetchall()}

        for file in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if file.name in applied:
                continue
            for statement in file.read_text(encoding="utf-8").split(";"):
                if statement.strip():
                    cursor.execute(statement)
            cursor.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (file.name,))
            print(f"[migrate] applied {file.name}")
