"""Password hashing (bcrypt), signed access tokens (PyJWT) and password-reset tokens."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, token_version: int, remember_me: bool = False) -> tuple[str, int]:
    """Returns (token, lifetime in seconds). 'Remember me' gives a longer-lived token."""
    lifetime = (
        timedelta(days=settings.REMEMBER_ME_DAYS)
        if remember_me
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "ver": token_version,
        "iat": now,
        "exp": now + lifetime,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, int(lifetime.total_seconds())


def decode_access_token(token: str) -> dict:
    """Raises a jwt.PyJWTError subclass when the token is invalid or expired."""
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
        options={"require": ["exp", "sub", "iat"]},
    )


def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def new_reset_token() -> tuple[str, str]:
    """Returns (raw token shown once in the reset link, hash stored in the database)."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_reset_token(raw)
