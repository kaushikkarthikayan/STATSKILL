"""Learning progress, worked out from stored answers and study records.

- A question is mastered once the student has answered it correctly at least once.
- A topic is completed when every active question in it is mastered.
- A topic is in progress once any of its questions has been answered, and not started before that.

Nothing is estimated. With no answers, every number is zero and every topic is "not started".
"""

from collections import defaultdict
from datetime import date, datetime, timedelta

from peewee import fn

from app.db.database import utcnow
from app.db.models import (
    Attempt,
    AttemptItem,
    Book,
    Course,
    Question,
    QuestionHistory,
    Resource,
    ResourceView,
    SavedBook,
    StudentTopic,
    Topic,
    User,
)
from app.services.common import accuracy
from app.services.progress import topic_stats

KIND_LABEL = {"assessment": "Assessment", "practice": "Practice set", "revision": "Revision set"}
STREAK_BADGE_DAYS = 3


# ---------- topics and courses ----------

def topic_overview(user_id: int, course_id: int) -> list[dict]:
    """One entry per topic, in course order, with mastery, state and whether the student picked it."""
    topics = list(Topic.select().where(Topic.course == course_id).order_by(Topic.id))
    if not topics:
        return []
    ids = [t.id for t in topics]

    totals = {topic_id: 0 for topic_id in ids}
    counted = (
        Question.select(Question.topic, fn.COUNT(Question.id).alias("n"))
        .where((Question.topic.in_(ids)) & (Question.is_active == True))  # noqa: E712
        .group_by(Question.topic)
    )
    for row in counted:
        totals[row.topic_id] = row.n

    seen: dict[int, int] = defaultdict(int)
    mastered: dict[int, int] = defaultdict(int)
    answers: dict[int, int] = defaultdict(int)
    correct: dict[int, int] = defaultdict(int)
    last_activity: dict[int, datetime] = {}
    history = (
        QuestionHistory.select(QuestionHistory, Question)
        .join(Question, on=(QuestionHistory.question == Question.id))
        .where(
            (QuestionHistory.user == user_id)
            & (Question.topic.in_(ids))
            & (Question.is_active == True)  # noqa: E712
        )
    )
    for row in history:
        topic_id = row.question.topic_id
        seen[topic_id] += 1
        if row.times_correct >= 1:
            mastered[topic_id] += 1
        answers[topic_id] += row.times_seen
        correct[topic_id] += row.times_correct
        if row.last_seen_at and (topic_id not in last_activity or row.last_seen_at > last_activity[topic_id]):
            last_activity[topic_id] = row.last_seen_at

    selected = {
        row.topic_id
        for row in StudentTopic.select().where((StudentTopic.user == user_id) & (StudentTopic.topic.in_(ids)))
    }

    material_topic = {
        r.id: r.topic_id
        for r in Resource.select(Resource.id, Resource.topic).where(
            (Resource.topic.in_(ids)) & (Resource.is_published == True)  # noqa: E712
        )
    }
    material_total: dict[int, int] = defaultdict(int)
    material_done: dict[int, int] = defaultdict(int)
    for topic_id in material_topic.values():
        material_total[topic_id] += 1
    if material_topic:
        finished = ResourceView.select(ResourceView.resource).where(
            (ResourceView.user == user_id)
            & (ResourceView.completed == True)  # noqa: E712
            & (ResourceView.resource.in_(list(material_topic)))
        )
        for row in finished:
            material_done[material_topic[row.resource_id]] += 1

    result = []
    for number, topic in enumerate(topics, start=1):
        total = totals[topic.id]
        if seen[topic.id] == 0:
            state = "not_started"
        elif total and mastered[topic.id] >= total:
            state = "completed"
        else:
            state = "in_progress"
        result.append(
            {
                "id": topic.id,
                "course_id": topic.course_id,
                "number": number,
                "name": topic.name,
                "skill_area": topic.skill_area,
                "description": topic.description,
                "learning_objectives": topic.learning_objectives or [],
                "question_count": total,
                "seen": seen[topic.id],
                "mastered": mastered[topic.id],
                "progress_percent": accuracy(mastered[topic.id], total),
                "answers": answers[topic.id],
                "correct_answers": correct[topic.id],
                "accuracy_percent": accuracy(correct[topic.id], answers[topic.id]),
                "state": state,
                "selected": topic.id in selected,
                "last_activity_at": last_activity.get(topic.id),
                "materials_total": material_total[topic.id],
                "materials_done": material_done[topic.id],
            }
        )
    return result


def course_progress(topics: list[dict]) -> dict:
    total = sum(t["question_count"] for t in topics)
    mastered = sum(t["mastered"] for t in topics)
    counts = {"completed": 0, "in_progress": 0, "not_started": 0}
    for topic in topics:
        counts[topic["state"]] += 1
    return {
        "total_questions": total,
        "mastered_questions": mastered,
        "progress_percent": accuracy(mastered, total),
        "topics_total": len(topics),
        "topics_completed": counts["completed"],
        "topics_in_progress": counts["in_progress"],
        "topics_not_started": counts["not_started"],
    }


def _published_courses() -> list[Course]:
    return list(Course.select().where(Course.is_published == True).order_by(Course.name))  # noqa: E712


def _course_cards(courses: list[Course], per_course: dict[int, list[dict]]) -> list[dict]:
    return [
        {
            "id": course.id,
            "name": course.name,
            "level": course.level,
            "duration_weeks": course.duration_weeks,
            "description": course.description,
            "required_skills": course.required_skills or [],
            "selected_topics": sum(1 for t in per_course[course.id] if t["selected"]),
            **course_progress(per_course[course.id]),
        }
        for course in courses
    ]


def courses_overview(user: User) -> list[dict]:
    courses = _published_courses()
    return _course_cards(courses, {c.id: topic_overview(user.id, c.id) for c in courses})


# ---------- streaks and counts ----------

def _submitted_attempts(user_id: int) -> list[Attempt]:
    return list(
        Attempt.select()
        .where((Attempt.user == user_id) & (Attempt.status == "submitted") & (Attempt.submitted_at.is_null(False)))
        .order_by(Attempt.submitted_at, Attempt.id)
    )


def _days_with_tests(attempts: list[Attempt]) -> dict[date, int]:
    counts: dict[date, int] = defaultdict(int)
    for attempt in attempts:
        counts[attempt.submitted_at.date()] += 1
    return counts


def current_streak(days: set[date], today: date) -> int:
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def best_streak(days: set[date]) -> int:
    best = run = 0
    previous = None
    for day in sorted(days):
        run = run + 1 if previous is not None and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return best


def learning_stats(user_id: int, attempts: list[Attempt] | None = None) -> dict:
    row = (
        QuestionHistory.select(fn.SUM(QuestionHistory.times_seen), fn.SUM(QuestionHistory.times_correct))
        .where(QuestionHistory.user == user_id)
        .scalar(as_tuple=True)
    )
    answers = int((row[0] if row else 0) or 0)
    correct = int((row[1] if row else 0) or 0)
    attempts = _submitted_attempts(user_id) if attempts is None else attempts
    per_day = _days_with_tests(attempts)
    today = utcnow().date()
    return {
        "answers": answers,
        "correct": correct,
        "accuracy_percent": accuracy(correct, answers),
        "tests_submitted": len(attempts),
        "streak_days": current_streak(set(per_day), today),
        "best_streak_days": best_streak(set(per_day)),
        "last_7_days": [
            {"date": (today - timedelta(days=offset)).isoformat(), "tests": per_day.get(today - timedelta(days=offset), 0)}
            for offset in range(6, -1, -1)
        ],
    }


# ---------- activity ----------

def recent_activity(user_id: int, limit: int = 10) -> list[dict]:
    events = []
    attempts = (
        Attempt.select()
        .where((Attempt.user == user_id) & (Attempt.status == "submitted"))
        .order_by(Attempt.submitted_at.desc())
        .limit(limit)
    )
    for attempt in attempts:
        events.append(
            {
                "kind": "test",
                "title": f"{KIND_LABEL.get(attempt.kind, 'Test')} submitted",
                "detail": f"{attempt.correct_count} of {attempt.question_count} correct ({attempt.score_percent}%)",
                "at": attempt.submitted_at,
                "link": f"/assessment/{attempt.id}",
            }
        )
    views = (
        ResourceView.select(ResourceView, Resource)
        .join(Resource, on=(ResourceView.resource == Resource.id))
        .where(ResourceView.user == user_id)
        .order_by(ResourceView.viewed_at.desc())
        .limit(limit)
    )
    for view in views:
        done = view.completed and view.completed_at
        events.append(
            {
                "kind": "material",
                "title": f"{'Finished' if done else 'Opened'} {view.resource.title}",
                "detail": view.resource.resource_type.upper(),
                "at": view.completed_at if done else view.viewed_at,
                "link": f"/training/topic/{view.resource.topic_id}" if view.resource.topic_id else "/training",
            }
        )
    saves = (
        SavedBook.select(SavedBook, Book)
        .join(Book, on=(SavedBook.book == Book.id))
        .where(SavedBook.user == user_id)
        .order_by(SavedBook.created_at.desc())
        .limit(limit)
    )
    for save in saves:
        events.append({"kind": "book", "title": f"Saved {save.book.title}", "detail": f"by {save.book.author}", "at": save.created_at, "link": "/training"})
    picks = (
        StudentTopic.select(StudentTopic, Topic)
        .join(Topic, on=(StudentTopic.topic == Topic.id))
        .where(StudentTopic.user == user_id)
        .order_by(StudentTopic.created_at.desc())
        .limit(limit)
    )
    for pick in picks:
        events.append(
            {
                "kind": "topic",
                "title": f"Picked {pick.topic.name}",
                "detail": "Added to your study plan",
                "at": pick.created_at,
                "link": f"/training/topic/{pick.topic_id}",
            }
        )
    events.sort(key=lambda event: event["at"], reverse=True)
    return events[:limit]


# ---------- achievements and milestones ----------

def build_achievements(user_id: int, stats: dict, all_topics: list[dict], attempts: list[Attempt]) -> list[dict]:
    first = attempts[0] if attempts else None
    perfect = next((a for a in attempts if a.question_count >= 5 and a.score_percent >= 100.0), None)

    assessments_by_course: dict[int, list[Attempt]] = defaultdict(list)
    for attempt in attempts:
        if attempt.kind == "assessment":
            assessments_by_course[attempt.course_id].append(attempt)
    comeback = any(
        len(items) >= 2 and items[-1].score_percent - items[0].score_percent >= 20 for items in assessments_by_course.values()
    )

    states_by_course: dict[int, list[str]] = defaultdict(list)
    for topic in all_topics:
        states_by_course[topic["course_id"]].append(topic["state"])
    completed_topics = sum(1 for t in all_topics if t["state"] == "completed")
    course_done = any(states and all(s == "completed" for s in states) for states in states_by_course.values())

    saved = SavedBook.select().where(SavedBook.user == user_id).count()
    finished = ResourceView.select().where((ResourceView.user == user_id) & (ResourceView.completed == True)).count()  # noqa: E712

    answers = stats["answers"]
    accurate = answers >= 20 and (stats["accuracy_percent"] or 0) >= 80
    return [
        {"id": "first-steps", "title": "First steps", "description": "Submit your first test.", "earned": first is not None, "earned_at": first.submitted_at if first else None, "hint": None},
        {"id": "perfect-score", "title": "Perfect score", "description": "Score 100% on a test with at least 5 questions.", "earned": perfect is not None, "earned_at": perfect.submitted_at if perfect else None, "hint": None},
        {"id": "sharp-shooter", "title": "Sharp shooter", "description": "Keep 80% accuracy across at least 20 answers.", "earned": accurate, "earned_at": None, "hint": None if accurate else f"{min(answers, 20)} of 20 answers so far"},
        {"id": "topic-master", "title": "Topic master", "description": "Master every question in one topic.", "earned": completed_topics > 0, "earned_at": None, "hint": None if completed_topics else "No topic completed yet"},
        {"id": "course-champion", "title": "Course champion", "description": "Complete every topic in a course.", "earned": course_done, "earned_at": None, "hint": None if course_done else f"{completed_topics} topics completed so far"},
        {"id": "bookworm", "title": "Bookworm", "description": "Save a book and finish a study material.", "earned": saved >= 1 and finished >= 1, "earned_at": None, "hint": None if (saved >= 1 and finished >= 1) else f"{saved} saved, {finished} finished"},
        {"id": "comeback", "title": "Comeback kid", "description": "Raise your assessment score by 20 points or more.", "earned": comeback, "earned_at": None, "hint": None},
        {"id": "on-a-roll", "title": "On a roll", "description": f"Take tests on {STREAK_BADGE_DAYS} days in a row.", "earned": stats["best_streak_days"] >= STREAK_BADGE_DAYS, "earned_at": None, "hint": None if stats["best_streak_days"] >= STREAK_BADGE_DAYS else f"Best streak: {stats['best_streak_days']} day(s)"},
    ]


def milestones(attempts: list[Attempt]) -> list[dict]:
    """A timeline built only from submitted tests."""
    events = []
    thresholds = [10, 25, 50, 100, 250]
    next_threshold = 0
    attempted = 0
    perfect_logged = False
    for index, attempt in enumerate(attempts):
        if index == 0:
            events.append({"title": "First test submitted", "detail": f"{attempt.score_percent}% on a {KIND_LABEL.get(attempt.kind, 'test').lower()}", "at": attempt.submitted_at})
        attempted += attempt.question_count
        while next_threshold < len(thresholds) and attempted >= thresholds[next_threshold]:
            events.append({"title": f"{thresholds[next_threshold]} questions attempted", "detail": "Across all your tests in this course", "at": attempt.submitted_at})
            next_threshold += 1
        if not perfect_logged and attempt.question_count >= 5 and attempt.score_percent >= 100.0:
            events.append({"title": "First perfect score", "detail": f"{attempt.question_count} out of {attempt.question_count} correct", "at": attempt.submitted_at})
            perfect_logged = True
    if len(attempts) >= 2:
        best = max(attempts, key=lambda a: (a.score_percent, a.submitted_at))
        events.append({"title": "Best score so far", "detail": f"{best.score_percent}% on a {KIND_LABEL.get(best.kind, 'test').lower()}", "at": best.submitted_at})
    events.sort(key=lambda event: event["at"])
    return events


# ---------- what to do next ----------

def _unfinished_attempt(user_id: int) -> dict | None:
    attempt = (
        Attempt.select()
        .where((Attempt.user == user_id) & (Attempt.status == "in_progress"))
        .order_by(Attempt.started_at.desc())
        .first()
    )
    if attempt is None:
        return None
    answered = AttemptItem.select().where((AttemptItem.attempt == attempt.id) & (AttemptItem.selected_index.is_null(False))).count()
    return {
        "attempt_id": attempt.id,
        "label": KIND_LABEL.get(attempt.kind, "Test"),
        "course_id": attempt.course_id,
        "answered": answered,
        "total": attempt.question_count,
    }


def continue_target(unfinished: dict | None, topics: list[dict]) -> dict | None:
    """Where the student left off: an unfinished test, then the topic they worked on last, then a fresh topic."""
    if unfinished:
        return {"type": "attempt", **unfinished}
    active = [t for t in topics if t["state"] == "in_progress"]
    if active:
        latest = max(active, key=lambda t: t["last_activity_at"] or datetime.min)
        return {"type": "topic", "topic_id": latest["id"], "name": latest["name"], "progress_percent": latest["progress_percent"]}
    fresh = next((t for t in topics if t["state"] == "not_started" and t["question_count"]), None)
    if fresh:
        return {"type": "start", "topic_id": fresh["id"], "name": fresh["name"]}
    return None


def up_next(user_id: int, course: Course, topics: list[dict], unfinished: dict | None) -> list[dict]:
    """Suggested next steps taken from the student's own results. This is not a calendar."""
    items = []
    if unfinished:
        items.append(
            {
                "kind": "resume",
                "title": f"Finish your {unfinished['label'].lower()}",
                "detail": f"{unfinished['answered']} of {unfinished['total']} answered",
                "link": f"/assessment/{unfinished['attempt_id']}",
            }
        )
    weak = [s for s in topic_stats(user_id, course.id) if s["status"] in ("weak", "developing")]
    weak.sort(key=lambda s: s["accuracy_percent"] if s["accuracy_percent"] is not None else 101)
    for stat in weak[:2]:
        items.append(
            {
                "kind": "revise",
                "title": f"Revise {stat['topic']}",
                "detail": f"{stat['correct']} of {stat['seen']} answers correct ({stat['accuracy_percent']}%)",
                "link": f"/training/topic/{stat['topic_id']}",
            }
        )
    for topic in [t for t in topics if t["state"] == "not_started" and t["question_count"]][:2]:
        items.append({"kind": "start", "title": f"Start {topic['name']}", "detail": f"{topic['question_count']} questions are waiting", "link": f"/training/topic/{topic['id']}"})
    finished = {
        v.resource_id
        for v in ResourceView.select(ResourceView.resource).where((ResourceView.user == user_id) & (ResourceView.completed == True))  # noqa: E712
    }
    pending = (
        Resource.select()
        .where((Resource.course == course.id) & (Resource.is_published == True))  # noqa: E712
        .order_by(Resource.id)
    )
    for resource in pending:
        if resource.id not in finished:
            items.append(
                {
                    "kind": "study",
                    "title": f"Study {resource.title}",
                    "detail": resource.resource_type.upper(),
                    "link": f"/training/topic/{resource.topic_id}" if resource.topic_id else "/training",
                }
            )
            break
    if not items:
        items.append({"kind": "assess", "title": "Take a fresh assessment", "detail": "See how much you remember", "link": "/assessment"})
    return items[:5]


# ---------- assembled responses ----------

def learning_overview(user: User, profile) -> dict:
    courses = _published_courses()
    per_course = {course.id: topic_overview(user.id, course.id) for course in courses}
    attempts = _submitted_attempts(user.id)
    stats = learning_stats(user.id, attempts)
    all_topics = [topic for topics in per_course.values() for topic in topics]
    base = {
        "welcome_name": user.full_name,
        "stats": stats,
        "courses": _course_cards(courses, per_course),
        "activity": recent_activity(user.id),
        "achievements": build_achievements(user.id, stats, all_topics, attempts),
    }

    course = profile.current_course
    if course is None or course.id not in per_course:
        return {**base, "course": None, "message": "Choose the course you are preparing for in your profile to see your learning plan."}

    topics = per_course[course.id]
    unfinished = _unfinished_attempt(user.id)
    in_course = [a for a in attempts if a.course_id == course.id]
    weak_names = [
        s["topic"] for s in topic_stats(user.id, course.id) if s["status"] in ("weak", "developing")
    ]
    return {
        **base,
        "course": {"id": course.id, "name": course.name, "level": course.level},
        "progress": course_progress(topics),
        "topics": topics,
        "continue": continue_target(unfinished, topics),
        "up_next": up_next(user.id, course, topics, unfinished),
        "assessments": [
            {
                "attempt_id": a.id,
                "kind": a.kind,
                "score_percent": a.score_percent,
                "correct": a.correct_count,
                "questions": a.question_count,
                "submitted_at": a.submitted_at,
            }
            for a in reversed(in_course[-6:])
        ],
        "recommended_topics": weak_names,
    }


def report_extras(user: User, course: Course) -> dict:
    """Extra data for the progress report: completion, per-topic state, badges and a timeline."""
    courses = _published_courses()
    per_course = {c.id: topic_overview(user.id, c.id) for c in courses}
    if course.id not in per_course:
        per_course[course.id] = topic_overview(user.id, course.id)
    attempts = _submitted_attempts(user.id)
    stats = learning_stats(user.id, attempts)
    all_topics = [topic for topics in per_course.values() for topic in topics]
    topics = per_course[course.id]
    return {
        "completion": course_progress(topics),
        "topic_overview": topics,
        "stats": stats,
        "achievements": build_achievements(user.id, stats, all_topics, attempts),
        "milestones": milestones([a for a in attempts if a.course_id == course.id]),
    }
