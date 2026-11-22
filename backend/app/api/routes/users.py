"""Administrators decide who can create content: list users, change roles, enable or disable accounts."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import AdminUser
from app.db.models import User
from app.services.common import get_or_404

router = APIRouter(prefix="/users", tags=["User management"])


class UserUpdate(BaseModel):
    role: Literal["student", "content_creator", "admin"] | None = None
    is_active: bool | None = None


def _out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
    }


@router.get("")
def list_users(
    admin: AdminUser,
    q: str | None = Query(default=None, max_length=120),
    role: str | None = Query(default=None, pattern="^(student|content_creator|admin)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = User.select()
    if q:
        query = query.where(User.email.contains(q) | User.full_name.contains(q))
    if role:
        query = query.where(User.role == role)
    total = query.count()
    rows = query.order_by(User.id).limit(limit).offset(offset)
    return {"total": total, "items": [_out(u) for u in rows]}


@router.put("/{user_id}")
def update_user(user_id: int, payload: UserUpdate, admin: AdminUser):
    target = get_or_404(User, user_id, "User not found.")
    changes = payload.model_dump(exclude_unset=True)
    if target.id == admin.id and (changes.get("role") not in (None, "admin") or changes.get("is_active") is False):
        raise HTTPException(400, "You cannot remove your own administrator access or disable your own account.")
    if changes.get("role") is not None:
        target.role = changes["role"]
    if changes.get("is_active") is not None:
        target.is_active = changes["is_active"]
    if target.id != admin.id:
        # Ending their sessions makes the new rights apply on their next login.
        target.token_version += 1
    target.save()
    return _out(target)
