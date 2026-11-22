"""Rule-based recommendations. Each one states the numbers it is based on. No data, no recommendation."""

from app.db.database import database
from app.db.models import Book, Course, Recommendation, Resource, User
from app.services.progress import topic_stats


def _add(user: User, course: Course, stat: dict, kind: str, message: str, evidence: dict) -> None:
    Recommendation.create(
        user=user.id,
        course=course.id,
        topic=stat["topic_id"],
        kind=kind,
        message=message,
        evidence=evidence,
        is_active=True,
    )


def active(user_id: int, course_id: int) -> list[dict]:
    rows = (
        Recommendation.select()
        .where(
            (Recommendation.user == user_id)
            & (Recommendation.course == course_id)
            & (Recommendation.is_active == True)  # noqa: E712
        )
        .order_by(Recommendation.id)
    )
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "topic_id": r.topic_id,
            "message": r.message,
            "evidence": r.evidence,
            "created_at": r.created_at,
        }
        for r in rows
    ]


def refresh(user: User, course: Course) -> list[dict]:
    """Replaces the student's active recommendations for a course, using current results."""
    stats = topic_stats(user.id, course.id)
    with database.atomic():
        Recommendation.update(is_active=False).where(
            (Recommendation.user == user.id)
            & (Recommendation.course == course.id)
            & (Recommendation.is_active == True)  # noqa: E712
        ).execute()

        for stat in stats:
            if stat["status"] not in ("weak", "developing"):
                continue
            evidence = {
                "topic": stat["topic"],
                "accuracy_percent": stat["accuracy_percent"],
                "seen": stat["seen"],
                "correct": stat["correct"],
            }
            detail = f"{stat['correct']} of {stat['seen']} {stat['topic']} questions correct ({stat['accuracy_percent']}%)"
            if stat["status"] == "weak":
                _add(user, course, stat, "missing_skill",
                     f"Missing skill: {detail}. Revise this topic before the next assessment.", evidence)
            else:
                _add(user, course, stat, "weak_area",
                     f"Developing: {detail}. Keep practising this topic.", evidence)
            _add(user, course, stat, "revision",
                 f"Take a revision set on {stat['topic']} to focus on the questions you missed.", evidence)

            resources = Resource.select().where(
                (Resource.topic == stat["topic_id"]) & (Resource.is_published == True)  # noqa: E712
            ).limit(2)
            for resource in resources:
                _add(user, course, stat, "study_material",
                     f"Study '{resource.title}' for {stat['topic']}.",
                     {**evidence, "resource_id": resource.id})

            books = Book.select().where(
                (Book.topic == stat["topic_id"]) & (Book.is_published == True)  # noqa: E712
            ).limit(2)
            for book in books:
                _add(user, course, stat, "book",
                     f"Read '{book.title}' by {book.author} for {stat['topic']}.",
                     {**evidence, "book_id": book.id})
    return active(user.id, course.id)
