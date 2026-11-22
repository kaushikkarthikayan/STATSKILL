"""Study material: PDF/DOCX uploads, links, notes, important points, completion and the topic page."""

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import CreatorUser, CurrentUser, is_staff
from app.db.database import database, utcnow
from app.db.models import (
    Book,
    Course,
    PointMark,
    Question,
    Resource,
    ResourcePoint,
    ResourceQuestion,
    ResourceView,
    SavedBook,
    Topic,
    User,
)
from app.schemas import CompletionIn, PointsIn, ResourceLinkIn, ResourceUpdate
from app.services.common import get_or_404
from app.services.progress import topic_stats
from app.services.uploads import delete_stored_file, resolve_stored_path, save_upload

resources_router = APIRouter(prefix="/resources", tags=["Study material"])
training_router = APIRouter(prefix="/training", tags=["Training"])


# ---------- helpers ----------

def _lines(text: str | None, limit: int, max_chars: int = 300) -> list[str]:
    lines = [line.strip() for line in (text or "").splitlines()]
    return [line[:max_chars] for line in lines if line][:limit]


def _resolve_scope(course_id: int | None, topic_id: int | None) -> tuple[Course, Topic | None]:
    topic = get_or_404(Topic, topic_id, "Topic not found.") if topic_id else None
    if course_id is None and topic is None:
        raise HTTPException(422, "Choose the course this resource belongs to.")
    course = get_or_404(Course, course_id, "Course not found.") if course_id else topic.course
    if topic is not None and topic.course_id != course.id:
        raise HTTPException(400, "That topic belongs to a different course.")
    return course, topic


def _can_view(resource: Resource, user: User) -> bool:
    return resource.is_published or is_staff(user)


def _require_edit(resource: Resource, user: User) -> None:
    if user.role == "admin" or resource.uploaded_by_id == user.id:
        return
    raise HTTPException(403, "Only the uploader or an administrator can change this resource.")


def _visible_or_404(resource_id: int, user: User) -> Resource:
    resource = get_or_404(Resource, resource_id, "Resource not found.")
    if not _can_view(resource, user):
        raise HTTPException(404, "Resource not found.")
    return resource


def _resource_out(resource: Resource) -> dict:
    return {
        "id": resource.id,
        "course_id": resource.course_id,
        "topic_id": resource.topic_id,
        "topic": resource.topic.name if resource.topic_id else None,
        "title": resource.title,
        "resource_type": resource.resource_type,
        "description": resource.description,
        "learning_objectives": resource.learning_objectives or [],
        "skill_parameter": resource.skill_parameter,
        "difficulty": resource.difficulty,
        "external_url": resource.external_url,
        "original_filename": resource.original_filename,
        "size_bytes": resource.size_bytes,
        "is_published": resource.is_published,
        "uploaded_by_id": resource.uploaded_by_id,
        "created_at": resource.created_at,
    }


def _point_out(point: ResourcePoint, marked: bool) -> dict:
    return {
        "id": point.id,
        "resource_id": point.resource_id,
        "topic_id": point.topic_id,
        "text": point.text,
        "is_key_concept": point.is_key_concept,
        "position": point.position,
        "marked": marked,
    }


def _create_points(resource: Resource, text: str, topic: Topic | None) -> None:
    """One point per line. A line starting with 'KEY:' is marked as a key concept."""
    for position, raw in enumerate(_lines(text, limit=60), start=1):
        is_key = raw.upper().startswith("KEY:")
        content = raw[4:].strip() if is_key else raw
        if len(content) >= 3:
            ResourcePoint.create(
                resource=resource,
                topic=topic,
                text=content[:500],
                is_key_concept=is_key,
                position=position,
            )


def _link_questions(resource: Resource, codes_text: str) -> None:
    wanted = [code.strip() for code in codes_text.split(",") if code.strip()]
    if not wanted:
        return
    found = list(Question.select().where(Question.code.in_(wanted)))
    missing = set(wanted) - {q.code for q in found}
    if missing:
        raise HTTPException(422, f"Unknown question code(s): {', '.join(sorted(missing))}")
    for question in found:
        ResourceQuestion.get_or_create(resource=resource, question=question)


# ---------- resources ----------

@resources_router.get("")
def list_resources(
    user: CurrentUser,
    course_id: int | None = None,
    topic_id: int | None = None,
    resource_type: str | None = None,
    q: str | None = None,
):
    query = Resource.select()
    if course_id is not None:
        query = query.where(Resource.course == course_id)
    if topic_id is not None:
        query = query.where(Resource.topic == topic_id)
    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    if q:
        query = query.where(Resource.title.contains(q))
    if not is_staff(user):
        query = query.where(Resource.is_published == True)  # noqa: E712
    done = {
        v.resource_id
        for v in ResourceView.select().where((ResourceView.user == user) & (ResourceView.completed == True))  # noqa: E712
    }
    return [
        {**_resource_out(r), "completed": r.id in done}
        for r in query.order_by(Resource.title)
    ]


@resources_router.get("/{resource_id}")
def get_resource(resource_id: int, user: CurrentUser):
    resource = _visible_or_404(resource_id, user)
    marked = {m.point_id for m in PointMark.select().where(PointMark.user == user)}
    points = ResourcePoint.select().where(ResourcePoint.resource == resource).order_by(ResourcePoint.position)
    return {
        **_resource_out(resource),
        "points": [_point_out(p, p.id in marked) for p in points],
        "related_question_count": ResourceQuestion.select().where(ResourceQuestion.resource == resource).count(),
    }


@resources_router.post("", status_code=201)
def create_link_or_note(payload: ResourceLinkIn, user: CreatorUser):
    course, topic = _resolve_scope(payload.course_id, payload.topic_id)
    resource = Resource.create(
        course=course,
        topic=topic,
        title=payload.title,
        resource_type=payload.resource_type,
        description=payload.description,
        learning_objectives=payload.learning_objectives,
        skill_parameter=payload.skill_parameter,
        difficulty=payload.difficulty,
        external_url=str(payload.external_url) if payload.external_url else None,
        is_published=payload.is_published,
        uploaded_by=user.id,
    )
    return _resource_out(resource)


@resources_router.post("/upload", status_code=201)
def upload_resource(
    user: CreatorUser,
    file: Annotated[UploadFile, File(description="A PDF or DOCX file")],
    title: Annotated[str, Form(min_length=3, max_length=200)],
    course_id: Annotated[int, Form(gt=0)],
    topic_id: Annotated[int | None, Form(gt=0)] = None,
    description: Annotated[str, Form(max_length=5000)] = "",
    learning_objectives: Annotated[str, Form(max_length=4000)] = "",
    skill_parameter: Annotated[str | None, Form(max_length=80)] = None,
    difficulty: Annotated[str | None, Form(pattern="^(easy|medium|hard)$")] = None,
    important_points: Annotated[str, Form(max_length=8000)] = "",
    related_question_codes: Annotated[str, Form(max_length=2000)] = "",
    is_published: Annotated[bool, Form()] = False,
):
    course, topic = _resolve_scope(course_id, topic_id)
    stored = save_upload(file)  # validates type, size and content before anything is saved
    if Resource.select().where(Resource.sha256 == stored.sha256).exists():
        delete_stored_file(stored.file_path)
        raise HTTPException(409, "This exact file has already been uploaded to the library.")
    try:
        with database.atomic():
            resource = Resource.create(
                course=course,
                topic=topic,
                title=title,
                resource_type=Path(stored.original_filename).suffix.lower().lstrip("."),
                description=description,
                learning_objectives=_lines(learning_objectives, limit=20),
                skill_parameter=skill_parameter,
                difficulty=difficulty,
                file_path=stored.file_path,
                original_filename=stored.original_filename,
                mime_type=stored.mime_type,
                size_bytes=stored.size_bytes,
                sha256=stored.sha256,
                is_published=is_published,
                uploaded_by=user.id,
            )
            _create_points(resource, important_points, topic)
            _link_questions(resource, related_question_codes)
    except BaseException:
        delete_stored_file(stored.file_path)
        raise
    return _resource_out(resource)


@resources_router.put("/{resource_id}")
def update_resource(resource_id: int, payload: ResourceUpdate, user: CreatorUser):
    resource = get_or_404(Resource, resource_id, "Resource not found.")
    _require_edit(resource, user)
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("topic_id") is not None:
        topic = get_or_404(Topic, changes["topic_id"], "Topic not found.")
        if resource.course_id and topic.course_id != resource.course_id:
            raise HTTPException(400, "That topic belongs to a different course.")
        resource.topic = topic
    if changes.get("external_url") is not None:
        if resource.resource_type != "link":
            raise HTTPException(400, "Only link resources have a URL.")
        resource.external_url = str(changes["external_url"])
    for field in ("title", "description", "learning_objectives", "skill_parameter", "difficulty", "is_published"):
        if changes.get(field) is not None:
            setattr(resource, field, changes[field])
    resource.save()
    return _resource_out(resource)


@resources_router.delete("/{resource_id}")
def delete_resource(resource_id: int, user: CreatorUser):
    resource = get_or_404(Resource, resource_id, "Resource not found.")
    _require_edit(resource, user)
    stored_name = resource.file_path
    resource.delete_instance()  # points, views and question links are removed by the database cascade
    delete_stored_file(stored_name)
    return {"message": "Resource deleted."}


@resources_router.get("/{resource_id}/download")
def open_resource(resource_id: int, user: CurrentUser):
    resource = _visible_or_404(resource_id, user)
    view = ResourceView.get_or_none((ResourceView.user == user) & (ResourceView.resource == resource))
    if view is None:
        ResourceView.create(user=user, resource=resource, viewed_at=utcnow())
    else:
        view.viewed_at = utcnow()
        view.save()

    if resource.resource_type == "link":
        return {"url": resource.external_url}
    if resource.resource_type == "note":
        return {"text": resource.description}
    path = resolve_stored_path(resource.file_path or "")
    if not path.exists():
        raise HTTPException(404, "The file is missing from storage. Please ask an administrator to upload it again.")
    disposition = "inline" if resource.resource_type == "pdf" else "attachment"
    return FileResponse(
        path,
        media_type=resource.mime_type,
        filename=resource.original_filename or path.name,
        content_disposition_type=disposition,
    )


@resources_router.post("/{resource_id}/progress")
def set_completion(resource_id: int, payload: CompletionIn, user: CurrentUser):
    resource = _visible_or_404(resource_id, user)
    view = ResourceView.get_or_none((ResourceView.user == user) & (ResourceView.resource == resource))
    if view is None:
        view = ResourceView(user=user, resource=resource)
    view.completed = payload.completed
    view.completed_at = utcnow() if payload.completed else None
    view.viewed_at = utcnow()
    view.save()
    return {"resource_id": resource.id, "completed": view.completed}


@resources_router.post("/{resource_id}/points", status_code=201)
def add_points(resource_id: int, payload: PointsIn, user: CreatorUser):
    resource = get_or_404(Resource, resource_id, "Resource not found.")
    _require_edit(resource, user)
    start = ResourcePoint.select().where(ResourcePoint.resource == resource).count()
    created = []
    with database.atomic():
        for offset, item in enumerate(payload.points, start=1):
            topic = get_or_404(Topic, item.topic_id, "Topic not found.") if item.topic_id else resource.topic
            point = ResourcePoint.create(
                resource=resource,
                topic=topic,
                text=item.text,
                is_key_concept=item.is_key_concept,
                position=start + offset,
            )
            created.append(_point_out(point, marked=False))
    return created


# ---------- training page and important points ----------

@training_router.get("/topics/{topic_id}")
def topic_training_page(topic_id: int, user: CurrentUser):
    """Everything the all-in-one training page needs for one topic, in one response."""
    topic = get_or_404(Topic, topic_id, "Topic not found.")
    course = topic.course
    staff = is_staff(user)
    if not course.is_published and not staff:
        raise HTTPException(404, "Topic not found.")

    resources = [r for r in Resource.select().where(Resource.topic == topic).order_by(Resource.title)]
    if not staff:
        resources = [r for r in resources if r.is_published]
    visible_ids = {r.id for r in resources}
    done = {
        v.resource_id
        for v in ResourceView.select().where((ResourceView.user == user) & (ResourceView.completed == True))  # noqa: E712
    }

    marked = {m.point_id for m in PointMark.select().where(PointMark.user == user)}
    point_rows = (
        ResourcePoint.select()
        .where(ResourcePoint.topic == topic)
        .order_by(ResourcePoint.resource, ResourcePoint.position)
    )
    points = [_point_out(p, p.id in marked) for p in point_rows if p.resource_id in visible_ids]

    books = [b for b in Book.select().where(Book.topic == topic).order_by(Book.title) if staff or b.is_published]
    saved = {s.book_id for s in SavedBook.select().where(SavedBook.user == user)}
    stat = next((s for s in topic_stats(user.id, course.id) if s["topic_id"] == topic.id), None)

    return {
        "topic": {
            "id": topic.id,
            "name": topic.name,
            "skill_area": topic.skill_area,
            "description": topic.description,
            "learning_objectives": topic.learning_objectives or [],
        },
        "course": {"id": course.id, "name": course.name},
        "performance": stat,
        "active_question_count": Question.select().where(
            (Question.topic == topic) & (Question.is_active == True)  # noqa: E712
        ).count(),
        "resources": [{**_resource_out(r), "completed": r.id in done} for r in resources],
        "points": points,
        "books": [
            {
                "id": b.id,
                "title": b.title,
                "author": b.author,
                "description": b.description,
                "url": b.url,
                "saved": b.id in saved,
            }
            for b in books
        ],
    }


@training_router.post("/points/{point_id}/mark")
def toggle_point_mark(point_id: int, user: CurrentUser):
    point = get_or_404(ResourcePoint, point_id, "Point not found.")
    if not _can_view(point.resource, user):
        raise HTTPException(404, "Point not found.")
    mark = PointMark.get_or_none((PointMark.user == user) & (PointMark.point == point))
    if mark is None:
        PointMark.create(user=user, point=point)
        return {"point_id": point.id, "marked": True}
    mark.delete_instance()
    return {"point_id": point.id, "marked": False}


@training_router.delete("/points/{point_id}")
def delete_point(point_id: int, user: CreatorUser):
    point = get_or_404(ResourcePoint, point_id, "Point not found.")
    _require_edit(point.resource, user)
    point.delete_instance()
    return {"message": "Important point deleted."}
