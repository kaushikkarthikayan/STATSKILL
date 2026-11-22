"""Shared FastAPI dependencies: the logged-in user and role checks."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.db.models import User

_bearer = HTTPBearer(auto_error=False)
_AUTH_HEADERS = {"WWW-Authenticate": "Bearer"}


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in to continue.", headers=_AUTH_HEADERS)
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Your session has expired. Please log in again.",
            headers=_AUTH_HEADERS,
        )
    user = User.get_or_none(User.id == user_id)
    if user is None or not user.is_active or payload.get("ver") != user.token_version:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Your session has ended. Please log in again.",
            headers=_AUTH_HEADERS,
        )
    return user


def require_roles(*roles: str):
    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to do this.")
        return user

    return checker


def is_staff(user: User) -> bool:
    """Content creators and administrators manage shared course content."""
    return user.role in ("content_creator", "admin")


CurrentUser = Annotated[User, Depends(get_current_user)]
CreatorUser = Annotated[User, Depends(require_roles("content_creator", "admin"))]
AdminUser = Annotated[User, Depends(require_roles("admin"))]
