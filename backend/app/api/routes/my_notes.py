"""My notes: a student uploads downloaded notes (PDF or DOCX) or pastes text, and uses them as private study material."""

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser
from app.db.models import Course, StudentNote, Topic
from app.services.common import get_or_404
from app.services.uploads import delete_stored_file, resolve_stored_path, save_upload

router = APIRouter(prefix="/my-notes", tags=["My notes"])


class TextNoteIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    text: str = Field(min_length=3, max_length=20000)
    course_id: int | None = Field(default=None, gt=0)
    topic_id: int | None = Field(default=None, gt=0)


def _scope(course_id: int | None, topic_id: int | None) -> tuple[Course | None, Topic | None]:
    topic = get_or_404(Topic, topic_id, "Topic not found.") if topic_id else None
    course = get_or_404(Course, course_id, "Course not found.") if course_id else (topic.course if topic else None)
    if topic and course and topic.course_id != course.id:
        raise HTTPException(400, "That topic does not belong to that course.")
    return course, topic


def _out(note: StudentNote) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "kind": note.kind,
        "text": note.body if note.kind == "text" else None,
        "original_filename": note.original_filename,
        "size_bytes": note.size_bytes,
        "course_id": note.course_id,
        "course": note.course.name if note.course else None,
        "topic_id": note.topic_id,
        "topic": note.topic.name if note.topic else None,
        "created_at": note.created_at,
    }


def _mine(note_id: int, user) -> StudentNote:
    note = StudentNote.get_or_none((StudentNote.id == note_id) & (StudentNote.user == user))
    if note is None:
        raise HTTPException(404, "Note not found.")  # also hides other students' notes
    return note


@router.get("")
def list_notes(user: CurrentUser, course_id: int | None = Query(default=None, gt=0), topic_id: int | None = Query(default=None, gt=0)):
    query = StudentNote.select().where(StudentNote.user == user).order_by(StudentNote.created_at.desc())
    if topic_id:
        query = query.where(StudentNote.topic == topic_id)
    elif course_id:
        query = query.where(StudentNote.course == course_id)
    return [_out(n) for n in query]


@router.post("/upload", status_code=201)
def upload_note(
    user: CurrentUser,
    file: Annotated[UploadFile, File(description="A PDF or DOCX file")],
    title: Annotated[str, Form(min_length=2, max_length=200)],
    course_id: Annotated[int | None, Form()] = None,
    topic_id: Annotated[int | None, Form()] = None,
):
    course, topic = _scope(course_id, topic_id)
    stored = save_upload(file)  # checks type, size and file content before anything is kept
    if StudentNote.select().where((StudentNote.user == user) & (StudentNote.sha256 == stored.sha256)).exists():
        delete_stored_file(stored.file_path)
        raise HTTPException(409, "You have already uploaded this exact file.")
    note = StudentNote.create(
        user=user,
        course=course,
        topic=topic,
        title=title.strip(),
        kind=Path(stored.original_filename).suffix.lower().lstrip("."),
        original_filename=stored.original_filename,
        file_path=stored.file_path,
        mime_type=stored.mime_type,
        size_bytes=stored.size_bytes,
        sha256=stored.sha256,
    )
    return _out(note)


@router.post("/text", status_code=201)
def add_text_note(payload: TextNoteIn, user: CurrentUser):
    course, topic = _scope(payload.course_id, payload.topic_id)
    note = StudentNote.create(user=user, course=course, topic=topic, title=payload.title.strip(), kind="text", body=payload.text.strip())
    return _out(note)


@router.get("/{note_id}/download")
def download_note(note_id: int, user: CurrentUser):
    note = _mine(note_id, user)
    if note.kind == "text" or not note.file_path:
        raise HTTPException(400, "This note is text; it has no file.")
    path = resolve_stored_path(note.file_path)
    if not path.exists():
        raise HTTPException(404, "The file is missing from storage. Please upload it again.")
    return FileResponse(
        path,
        media_type=note.mime_type or "application/octet-stream",
        filename=note.original_filename,
        content_disposition_type="inline" if note.kind == "pdf" else "attachment",
    )


@router.delete("/{note_id}")
def delete_note(note_id: int, user: CurrentUser):
    note = _mine(note_id, user)
    stored = note.file_path
    note.delete_instance()
    delete_stored_file(stored)
    return {"message": "Note deleted."}