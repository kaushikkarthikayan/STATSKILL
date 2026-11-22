"""Validates and stores uploaded study files.

Checks: an extension allow-list, a size limit, the real file signature (not just the name),
and a random storage name, so a client-supplied file name never reaches the file system.
"""

import hashlib
import re
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import settings

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
ALLOWED_EXTENSIONS = {".pdf": "application/pdf", ".docx": DOCX_MIME}
_CHUNK_BYTES = 1024 * 1024


@dataclass
class StoredFile:
    file_path: str
    original_filename: str
    mime_type: str
    size_bytes: int
    sha256: str


def clean_filename(name: str | None) -> str:
    base = Path(name or "upload").name
    base = re.sub(r"[^A-Za-z0-9._ -]+", "_", base).strip(" .")
    return (base or "upload")[:200]


def _has_valid_signature(path: Path, extension: str) -> bool:
    with path.open("rb") as handle:
        head = handle.read(8)
    if extension == ".pdf":
        return head.startswith(b"%PDF-")
    if not head.startswith(b"PK\x03\x04"):
        return False
    try:
        with zipfile.ZipFile(path) as archive:
            return "word/document.xml" in archive.namelist()
    except zipfile.BadZipFile:
        return False


def save_upload(upload: UploadFile) -> StoredFile:
    original = clean_filename(upload.filename)
    extension = Path(original).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(415, "Only PDF and DOCX files can be uploaded.")

    root = settings.upload_root
    root.mkdir(parents=True, exist_ok=True)
    temp_path = root / f".{uuid.uuid4().hex}.part"
    digest = hashlib.sha256()
    size = 0
    try:
        with temp_path.open("wb") as out:
            while chunk := upload.file.read(_CHUNK_BYTES):
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise HTTPException(413, f"The file is larger than {settings.MAX_UPLOAD_MB} MB.")
                digest.update(chunk)
                out.write(chunk)
        if size == 0:
            raise HTTPException(422, "The file is empty.")
        if not _has_valid_signature(temp_path, extension):
            raise HTTPException(415, "The file content does not match its extension, so it was rejected.")
        stored_name = f"{uuid.uuid4().hex}{extension}"
        temp_path.replace(root / stored_name)
    except BaseException:
        temp_path.unlink(missing_ok=True)
        raise

    return StoredFile(
        file_path=stored_name,
        original_filename=original,
        mime_type=ALLOWED_EXTENSIONS[extension],
        size_bytes=size,
        sha256=digest.hexdigest(),
    )


def resolve_stored_path(file_path: str) -> Path:
    root = settings.upload_root.resolve()
    candidate = (root / file_path).resolve()
    if root not in candidate.parents:
        raise HTTPException(404, "File not found.")
    return candidate


def delete_stored_file(file_path: str | None) -> None:
    if not file_path:
        return
    try:
        resolve_stored_path(file_path).unlink(missing_ok=True)
    except HTTPException:
        pass
