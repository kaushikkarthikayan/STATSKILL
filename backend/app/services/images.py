"""Validates and stores creator photos: JPEG, PNG or WebP, up to 2 MB.

Same safety rules as study files: the file type is checked by its real content, and the
file is stored under a random name so a client-supplied name never reaches the file system.
"""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import settings

MAX_IMAGE_BYTES = 2 * 1024 * 1024
IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _matches_signature(head: bytes, extension: str) -> bool:
    if extension in (".jpg", ".jpeg"):
        return head.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    return head[:4] == b"RIFF" and head[8:12] == b"WEBP"


def save_image(upload: UploadFile) -> tuple[str, str]:
    """Returns (path relative to the upload folder, mime type)."""
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in IMAGE_TYPES:
        raise HTTPException(415, "Photos must be JPG, PNG or WebP files.")
    data = upload.file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(422, "The photo file is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "The photo is larger than 2 MB.")
    if not _matches_signature(data[:16], extension):
        raise HTTPException(415, "The file content does not match its extension, so it was rejected.")

    folder = settings.upload_root / "creators"
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{extension}"
    (folder / name).write_bytes(data)
    return f"creators/{name}", IMAGE_TYPES[extension]
