"""Student progress: topic-wise performance, assessment history, improvement and training completion.

Every number comes from stored answers. A topic is judged as strong or weak only after
MIN_EVIDENCE answers across tests, so one question does not decide a weak area.
"""

from app.db.models import Attempt, Book, Question, QuestionHistory, Resource, ResourceView, SavedBook, Topic, User
from app.services.common import accuracy, status_for


def topic_stats(user_id: int, course_id: int) -> list[dict]:
    """Cumulative results per topic. Unanswered questions count as incorrect."""
    topics = list(Topic.select().where(Topic.course == course_id).order_by(Topic.name))
    if not topics:
        return []
    totals = {t.id: {"seen": 0, "correct": 0} for t in topics}
    rows = (
        QuestionHistory.select(QuestionHistory, Question)
        .join(Question, on=(QuestionHistory.question == Question.id))
        .where((QuestionHistory.user == user_id) & (Question.topic.in_([t.id for t in topics])))
    )
    for row in rows:
        bucket = totals.setdefault(row.question.topic_id, {"seen": 0, "correct": 0})
        bucket["seen"] += row.times_seen
        bucket["correct"] += row.times_correct

    stats = []
    for topic in topics:
        bucket = totals[topic.id]
        percent = accuracy(bucket["correct"], bucket["seen"])
        stats.append(
            {
                "topic_id": topic.id,
                "topic": topic.name,
                "skill_area": topic.skill_area,
                "seen": bucket["seen"],
                "correct": bucket["correct"],
                "accuracy_percent": percent,
                "status": status_for(percent, bucket["seen"]),
            }
        )
    return stats


def assessment_history(user_id: int, course_id: int) -> list[dict]:
    attempts = (
        Attempt.select()
        .where((Attempt.user == user_id) & (Attempt.course == course_id) & (Attempt.status == "submitted"))
        .order_by(Attempt.submitted_at, Attempt.id)
    )
    return [
        {
            "attempt_id": a.id,
            "kind": a.kind,
            "topic_id": a.topic_id,
            "submitted_at": a.submitted_at,
            "score_percent": a.score_percent,
            "correct": a.correct_count,
            "questions": a.question_count,
            "pool_note": a.pool_note,
        }
        for a in attempts
    ]


def improvement(history: list[dict]) -> dict:
    points = [
        {"submitted_at": h["submitted_at"], "score_percent": h["score_percent"]}
        for h in history
        if h["kind"] == "assessment"
    ]
    change = round(points[-1]["score_percent"] - points[0]["score_percent"], 1) if len(points) >= 2 else None
    return {"points": points, "change_percent_points": change}


def training_summary(user_id: int, course_id: int) -> dict:
    total = Resource.select().where(
        (Resource.course == course_id) & (Resource.is_published == True)  # noqa: E712
    ).count()
    completed = (
        ResourceView.select()
        .join(Resource, on=(ResourceView.resource == Resource.id))
        .where(
            (ResourceView.user == user_id)
            & (ResourceView.completed == True)  # noqa: E712
            & (Resource.course == course_id)
            & (Resource.is_published == True)  # noqa: E712
        )
        .count()
    )
    saved = (
        SavedBook.select()
        .join(Book, on=(SavedBook.book == Book.id))
        .where((SavedBook.user == user_id) & (Book.course == course_id))
        .count()
    )
    return {
        "published_materials": total,
        "completed_materials": completed,
        "completion_percent": accuracy(completed, total),
        "saved_books": saved,
    }


def _overall(topics: list[dict]) -> tuple[int, int]:
    return sum(t["seen"] for t in topics), sum(t["correct"] for t in topics)


def build_report(user: User, profile, course) -> dict:
    topics = topic_stats(user.id, course.id)
    seen, correct = _overall(topics)
    history = assessment_history(user.id, course.id)
    latest = next((h for h in reversed(history) if h["kind"] == "assessment"), None)
    return {
        "student": {
            "full_name": user.full_name,
            "email": user.email,
            "college": profile.college,
            "graduation_year": profile.graduation_year,
            "interests": profile.interests or [],
        },
        "course": {"id": course.id, "name": course.name, "level": course.level, "required_skills": course.required_skills or []},
        "overall": {
            "questions_seen": seen,
            "correct": correct,
            "accuracy_percent": accuracy(correct, seen),
            "tests_submitted": len(history),
            "latest_assessment_score": latest["score_percent"] if latest else None,
        },
        "topics": topics,
        "strong_areas": [t for t in topics if t["status"] == "strong"],
        "weak_areas": [t for t in topics if t["status"] in ("weak", "developing")],
        "missing_skills": [t for t in topics if t["status"] == "weak"],
        "not_assessed_topics": [t for t in topics if t["status"] == "not_assessed"],
        "assessment_history": history,
        "improvement": improvement(history),
        "training": training_summary(user.id, course.id),
    }


def build_dashboard(user: User, profile) -> dict:
    course = profile.current_course
    if course is None:
        return {
            "welcome_name": user.full_name,
            "course": None,
            "message": "Choose the course you are preparing for in your profile to see your dashboard.",
        }
    topics = topic_stats(user.id, course.id)
    seen, correct = _overall(topics)
    history = assessment_history(user.id, course.id)
    latest = next((h for h in reversed(history) if h["kind"] == "assessment"), None)
    recent = (
        ResourceView.select(ResourceView, Resource)
        .join(Resource, on=(ResourceView.resource == Resource.id))
        .where((ResourceView.user == user.id) & (Resource.is_published == True))  # noqa: E712
        .order_by(ResourceView.viewed_at.desc())
        .limit(5)
    )
    return {
        "welcome_name": user.full_name,
        "course": {"id": course.id, "name": course.name},
        "latest_assessment_score": latest["score_percent"] if latest else None,
        "overall_progress_percent": accuracy(correct, seen),
        "missing_skills": [t["topic"] for t in topics if t["status"] == "weak"],
        "recommended_topics": [t["topic"] for t in topics if t["status"] in ("weak", "developing")],
        "recent_materials": [
            {
                "resource_id": v.resource.id,
                "title": v.resource.title,
                "resource_type": v.resource.resource_type,
                "viewed_at": v.viewed_at,
                "completed": v.completed,
            }
            for v in recent
        ],
        "training": training_summary(user.id, course.id),
    }
