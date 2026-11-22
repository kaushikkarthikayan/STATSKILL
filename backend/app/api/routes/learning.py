"""Learning plan: courses with completion, topic states, and the topics a student picked to study."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, is_staff
from app.db.database import database
from app.db.models import Course, StudentTopic, Topic
from app.services.common import ensure_profile, get_or_404
from app.services.learning import course_progress, courses_overview, learning_overview, topic_overview

router = APIRouter(prefix="/learning", tags=["Learning plan"])


class SelectionIn(BaseModel):
    selected: bool


class CourseSelectionIn(BaseModel):
    course_id: int = Field(gt=0)
    topic_ids: list[int] = Field(default_factory=list, max_length=100)


def _visible(course: Course, user) -> Course:
    if not course.is_published and not is_staff(user):
        raise HTTPException(404, "Course not found.")
    return course


@router.get("/overview")
def overview(user: CurrentUser):
    """Everything the dashboard shows, in one response."""
    return learning_overview(user, ensure_profile(user))


@router.get("/courses")
def courses(user: CurrentUser):
    return courses_overview(user)


@router.get("/topics")
def topics(user: CurrentUser, course_id: int | None = Query(default=None, gt=0)):
    profile = ensure_profile(user)
    if course_id is not None:
        course = _visible(get_or_404(Course, course_id, "Course not found."), user)
    elif profile.current_course is not None:
        course = profile.current_course
    else:
        raise HTTPException(400, "Choose the course you are preparing for first.")
    items = topic_overview(user.id, course.id)
    return {
        "course": {"id": course.id, "name": course.name, "level": course.level},
        "progress": course_progress(items),
        "topics": items,
    }


@router.put("/topics/{topic_id}/selection")
def set_topic_selection(topic_id: int, payload: SelectionIn, user: CurrentUser):
    topic = get_or_404(Topic, topic_id, "Topic not found.")
    _visible(topic.course, user)
    row = StudentTopic.get_or_none((StudentTopic.user == user) & (StudentTopic.topic == topic))
    if payload.selected and row is None:
        StudentTopic.create(user=user, topic=topic)
    elif not payload.selected and row is not None:
        row.delete_instance()
    return {"topic_id": topic.id, "selected": payload.selected}


@router.put("/selection")
def set_course_selection(payload: CourseSelectionIn, user: CurrentUser):
    """Replaces the student's picked topics for one course (used by 'select all' and 'clear')."""
    course = _visible(get_or_404(Course, payload.course_id, "Course not found."), user)
    wanted = set(payload.topic_ids)
    valid = {t.id for t in Topic.select(Topic.id).where(Topic.course == course)}
    if not wanted <= valid:
        raise HTTPException(400, "Some of those topics belong to a different course.")
    with database.atomic():
        current = {}
        if valid:
            rows = StudentTopic.select().where((StudentTopic.user == user) & (StudentTopic.topic.in_(list(valid))))
            current = {row.topic_id: row for row in rows}
        for topic_id, row in current.items():
            if topic_id not in wanted:
                row.delete_instance()
        for topic_id in wanted - set(current):
            StudentTopic.create(user=user, topic=topic_id)
    return {"course_id": course.id, "topic_ids": sorted(wanted)}
