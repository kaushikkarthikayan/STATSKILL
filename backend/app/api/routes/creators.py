"""The team on the About page. Anyone can read it; only administrators edit it."""

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.api.deps import AdminUser
from app.db.models import Creator
from app.services.common import get_or_404
from app.services.creators import ensure_team_creators
from app.services.images import save_image
from app.services.options import AVATAR_IDS
from app.services.uploads import delete_stored_file, resolve_stored_path

router = APIRouter(prefix="/creators", tags=["About and creators"])

HEX_COLOR = r"^#[0-9A-Fa-f]{6}$"


class CreatorIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    nickname: str | None = Field(default=None, max_length=40)
    role_title: str = Field(default="Team member", min_length=2, max_length=120)
    title: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=1000)
    intro: str = Field(default="", max_length=1000)
    theme_color: str = Field(default="#BDF700", pattern=HEX_COLOR)
    avatar: str = Field(default="scholar", max_length=30)


class CreatorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    nickname: str | None = Field(default=None, max_length=40)
    role_title: str | None = Field(default=None, min_length=2, max_length=120)
    title: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=1000)
    intro: str | None = Field(default=None, max_length=1000)
    theme_color: str | None = Field(default=None, pattern=HEX_COLOR)
    avatar: str | None = Field(default=None, max_length=30)


def _check_avatar(avatar: str | None) -> None:
    if avatar is not None and avatar not in AVATAR_IDS:
        raise HTTPException(422, "Choose one of the listed avatars.")


def _out(creator: Creator) -> dict:
    return {
        "id": creator.id,
        "name": creator.name,
        "nickname": creator.nickname,
        "role_title": creator.role_title,
        "title": creator.title or "",
        "description": creator.description,
        "intro": creator.intro or "",
        "theme_color": creator.theme_color or "#BDF700",
        "avatar": creator.avatar or "scholar",
        "has_photo": bool(creator.photo_path),
        "photo_url": f"/api/creators/{creator.id}/photo" if creator.photo_path else None,
        "is_placeholder": creator.is_placeholder,
    }


@router.get("")
def list_creators():
    ensure_team_creators()
    return [_out(c) for c in Creator.select().order_by(Creator.position, Creator.id)]


@router.post("", status_code=201)
def add_creator(payload: CreatorIn, admin: AdminUser):
    _check_avatar(payload.avatar)
    creator = Creator.create(
        name=payload.name,
        nickname=payload.nickname,
        role_title=payload.role_title,
        title=payload.title,
        description=payload.description,
        intro=payload.intro,
        theme_color=payload.theme_color,
        avatar=payload.avatar,
        position=Creator.select().count() + 1,
        is_placeholder=False,
    )
    return _out(creator)


@router.put("/{creator_id}")
def update_creator(creator_id: int, payload: CreatorUpdate, admin: AdminUser):
    creator = get_or_404(Creator, creator_id, "Creator not found.")
    changes = payload.model_dump(exclude_unset=True)
    _check_avatar(changes.get("avatar"))
    for field in ("name", "role_title", "title", "description", "intro", "theme_color", "avatar"):
        if changes.get(field) is not None:
            setattr(creator, field, changes[field])
    if "nickname" in changes:
        creator.nickname = changes["nickname"] or None
    creator.is_placeholder = False  # once edited, these are the real details
    creator.save()
    return _out(creator)


@router.delete("/{creator_id}")
def delete_creator(creator_id: int, admin: AdminUser):
    creator = get_or_404(Creator, creator_id, "Creator not found.")
    stored = creator.photo_path
    creator.delete_instance()
    delete_stored_file(stored)
    return {"message": "Creator removed."}


@router.post("/{creator_id}/photo")
def upload_photo(creator_id: int, admin: AdminUser, file: Annotated[UploadFile, File()]):
    creator = get_or_404(Creator, creator_id, "Creator not found.")
    stored_path, mime = save_image(file)
    previous = creator.photo_path
    creator.photo_path = stored_path
    creator.photo_mime = mime
    creator.is_placeholder = False
    creator.save()
    delete_stored_file(previous)
    return _out(creator)


@router.get("/{creator_id}/photo")
def get_photo(creator_id: int):
    creator = get_or_404(Creator, creator_id, "Creator not found.")
    if not creator.photo_path:
        raise HTTPException(404, "This creator has no photo.")
    path = resolve_stored_path(creator.photo_path)
    if not path.exists():
        raise HTTPException(404, "The photo file is missing from storage.")
    return FileResponse(path, media_type=creator.photo_mime or "application/octet-stream")
