"""
Per-user auth helpers: JWT creation/validation + user registry.
"""
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import jwt

SECRET = os.getenv("SECRET_KEY", "dev-secret-change-me-in-production")
ALGORITHM = "HS256"
TOKEN_DAYS = 30


# ── JWT ──────────────────────────────────────────────────────────────────────

def make_token(user_id: str, email: str, name: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure."""
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])


# ── User registry ─────────────────────────────────────────────────────────────

_REGISTRY = Path("users") / ".registry.json"


def _load_registry() -> dict:
    if _REGISTRY.exists():
        try:
            return json.loads(_REGISTRY.read_text())
        except Exception:
            return {}
    return {}


def _save_registry(data: dict):
    _REGISTRY.parent.mkdir(parents=True, exist_ok=True)
    _REGISTRY.write_text(json.dumps(data, indent=2))


def get_user(user_id: str) -> Optional[dict]:
    return _load_registry().get(user_id)


def upsert_user(user_id: str, fields: dict) -> dict:
    reg = _load_registry()
    reg[user_id] = {**(reg.get(user_id) or {}), **fields}
    _save_registry(reg)
    return reg[user_id]


def user_is_setup(user_id: str) -> bool:
    """Returns True if the user has entered their Gemini API key."""
    u = get_user(user_id)
    return bool(u and u.get("gemini_key"))


# ── Per-user paths ────────────────────────────────────────────────────────────

def user_dir(user_id: str) -> Path:
    p = Path("users") / user_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def user_env(user_id: str) -> dict:
    """
    Build the os.environ dict for a per-user subprocess run of main.py.
    Injects user-specific paths and API keys so the pipeline is fully isolated.
    """
    u = get_user(user_id) or {}
    d = user_dir(user_id)
    return {
        **os.environ,
        "GOOGLE_API_KEY":    u.get("gemini_key",  os.getenv("GOOGLE_API_KEY", "")),
        "GROQ_API_KEY":      u.get("groq_key",    os.getenv("GROQ_API_KEY", "")),
        "MY_EMAIL":          u.get("email",        os.getenv("MY_EMAIL", "")),
        "IF_HISTORY_FILE":   str(d / "history.json"),
        "IF_TOKEN_FILE":     str(d / "token.json"),
        "IF_DB_DIR":         str(d / "db_local"),
    }
