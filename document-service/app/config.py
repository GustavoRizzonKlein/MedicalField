import os
from pathlib import Path


def _load_env_file(path: Path) -> None:
    """Loads KEY=VALUE lines from .env; real environment variables always win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


_load_env_file(Path(".env"))


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


PORT = int(_env("PORT", "8082"))

DB = {
    "host": _env("DB_HOST", "localhost"),
    "port": int(_env("DB_PORT", "3306")),
    "user": _env("DB_USER", "medicalfield"),
    "password": _env("DB_PASSWORD", "medicalfield_dev"),
    "database": _env("DB_NAME", "medicalfield_documents"),
}

JWT_PUBLIC_KEY_PATH = Path(_env("JWT_PUBLIC_KEY_PATH", "../keys/jwt-public.pem"))
JWT_ISSUER = "medicalfield-identity"
CLINICAL_SERVICE_URL = _env("CLINICAL_SERVICE_URL", "http://localhost:8080").rstrip("/")

EMAIL_MODE = _env("EMAIL_MODE", "file")
EMAIL_OUTBOX_DIR = Path(_env("EMAIL_OUTBOX_DIR", "outbox"))
EMAIL_FROM = _env("EMAIL_FROM", "MedicalField <no-reply@medicalfield.local>")
SMTP_HOST = _env("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER", "")
SMTP_PASSWORD = _env("SMTP_PASSWORD", "")
SMTP_STARTTLS = _env("SMTP_STARTTLS", "true").lower() == "true"
