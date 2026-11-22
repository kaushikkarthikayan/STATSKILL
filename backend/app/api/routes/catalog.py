"""Courses and their topics. Students see published courses; creators and admins manage them."""

from fastapi import APIRouter, HTTPException

from app.api.deps import AdminUser, CreatorUser, CurrentUser, is_staff
from app.db.models import Attempt, Course, Question, Topic
from app.schemas import CourseIn, CourseUpdate, TopicIn, TopicUpdate
from app.services.common import get_or_404, slugify

router = APIRouter(tags=["Courses and topics"])


def _topic_out(topic: Topic) -> dict:
    return {
        "id": topic.id,
        "course_id": topic.course_id,
        "name": topic.name,
        "slug": topic.slug,
        "skill_area": topic.skill_area,
        "description": topic.description,
        "learning_objectives": topic.learning_objectives or [],
        "question_count": Question.select().where(
            (Question.topic == topic) & (Question.is_active == True)  # noqa: E712
        ).count(),
    }


def _course_out(course: Course, detail: bool = False) -> dict:
    data = {
        "id": course.id,
        "name": course.name,
        "slug": course.slug,
        "level": course.level,
        "duration_weeks": course.duration_weeks,
        "is_published": course.is_published,
        "topic_count": Topic.select().where(Topic.course == course).count(),
    }
    if detail:
        topics = Topic.select().where(Topic.course == course).order_by(Topic.name)
        data.update(
            {
                "description": course.description,
                "required_skills": course.required_skills or [],
                "training_parameters": course.training_parameters or {},
                "topics": [_topic_out(t) for t in topics],
            }
        )
    return data


def _visible_course(course_id: int, user) -> Course:
    course = get_or_404(Course, course_id, "Course not found.")
    if not course.is_published and not is_staff(user):
        raise HTTPException(404, "Course not found.")
    return course


@router.get("/courses")
def list_courses(user: CurrentUser):
    query = Course.select().order_by(Course.name)
    if not is_staff(user):
        query = query.where(Course.is_published == True)  # noqa: E712
    return [_course_out(course) for course in query]


@router.post("/courses", status_code=201)
def create_course(payload: CourseIn, user: CreatorUser):
    slug = slugify(payload.name)
    if Course.select().where((Course.name == payload.name) | (Course.slug == slug)).exists():
        raise HTTPException(409, "A course with this name already exists.")
    course = Course.create(
        name=payload.name,
        slug=slug,
        description=payload.description,
        level=payload.level,
        duration_weeks=payload.duration_weeks,
        required_skills=payload.required_skills,
        training_parameters=payload.training_parameters,
        is_published=payload.is_published,
        created_by=user.id,
    )
    return _course_out(course, detail=True)


@router.get("/courses/{course_id}")
def get_course(course_id: int, user: CurrentUser):
    return _course_out(_visible_course(course_id, user), detail=True)


@router.put("/courses/{course_id}")
def update_course(course_id: int, payload: CourseUpdate, user: CreatorUser):
    course = get_or_404(Course, course_id, "Course not found.")
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("name"):
        new_slug = slugify(changes["name"])
        clash = Course.select().where(
            ((Course.name == changes["name"]) | (Course.slug == new_slug)) & (Course.id != course.id)
        ).exists()
        if clash:
            raise HTTPException(409, "Another course already uses this name.")
        course.name = changes["name"]
        course.slug = new_slug
    for field in ("description", "level", "duration_weeks", "required_skills", "training_parameters", "is_published"):
        if changes.get(field) is not None:
            setattr(course, field, changes[field])
    course.save()
    return _course_out(course, detail=True)


@router.delete("/courses/{course_id}")
def delete_course(course_id: int, user: AdminUser):
    course = get_or_404(Course, course_id, "Course not found.")
    if Attempt.select().where(Attempt.course == course).exists():
        raise HTTPException(
            409,
            "Students have taken tests in this course, so it cannot be deleted. Unpublish it instead.",
        )
    course.delete_instance()  # topics and questions are removed by the database cascade
    return {"message": "Course deleted."}


@router.get("/courses/{course_id}/topics")
def list_topics(course_id: int, user: CurrentUser):
    course = _visible_course(course_id, user)
    return [_topic_out(t) for t in Topic.select().where(Topic.course == course).order_by(Topic.name)]


@router.post("/courses/{course_id}/topics", status_code=201)
def create_topic(course_id: int, payload: TopicIn, user: CreatorUser):
    course = get_or_404(Course, course_id, "Course not found.")
    slug = slugify(payload.name)
    clash = Topic.select().where(
        (Topic.course == course) & ((Topic.name == payload.name) | (Topic.slug == slug))
    ).exists()
    if clash:
        raise HTTPException(409, "This course already has a topic with that name.")
    topic = Topic.create(
        course=course,
        name=payload.name,
        slug=slug,
        skill_area=payload.skill_area,
        description=payload.description,
        learning_objectives=payload.learning_objectives,
    )
    return _topic_out(topic)


@router.put("/topics/{topic_id}")
def update_topic(topic_id: int, payload: TopicUpdate, user: CreatorUser):
    topic = get_or_404(Topic, topic_id, "Topic not found.")
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("name"):
        new_slug = slugify(changes["name"])
        clash = Topic.select().where(
            (Topic.course == topic.course_id) & (Topic.slug == new_slug) & (Topic.id != topic.id)
        ).exists()
        if clash:
            raise HTTPException(409, "This course already has a topic with that name.")
        topic.name = changes["name"]
        topic.slug = new_slug
    for field in ("skill_area", "description", "learning_objectives"):
        if changes.get(field) is not None:
            setattr(topic, field, changes[field])
    topic.save()
    return _topic_out(topic)


@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: int, user: AdminUser):
    topic = get_or_404(Topic, topic_id, "Topic not found.")
    if Question.select().where(Question.topic == topic).exists():
        raise HTTPException(409, "Remove or move this topic's questions before deleting the topic.")
    topic.delete_instance()
    return {"message": "Topic deleted."}
