"""Tests and practice for students: start a set, answer, submit, and review the results."""

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser
from app.db.database import database
from app.db.models import Attempt, AttemptItem, Course, Question, Topic, User
from app.schemas import AnswerIn, AttemptStartIn
from app.services import recommendations
from app.services.common import get_or_404
from app.services.scoring import attempt_analysis, attempt_breakdown, submit_attempt
from app.services.selection import select_questions

router = APIRouter(prefix="/assessments", tags=["Assessments and practice"])


def _own_attempt(attempt_id: int, user: User) -> Attempt:
    attempt = Attempt.get_or_none((Attempt.id == attempt_id) & (Attempt.user == user))
    if attempt is None:
        raise HTTPException(404, "Test not found.")
    return attempt


def _attempt_view(attempt: Attempt, reveal: bool) -> dict:
    """reveal=True is used only after submission, so correct answers are never shown mid-test."""
    rows = (
        AttemptItem.select(AttemptItem, Question, Topic)
        .join(Question, on=(AttemptItem.question == Question.id))
        .join(Topic, on=(Question.topic == Topic.id))
        .where(AttemptItem.attempt == attempt.id)
        .order_by(AttemptItem.position)
    )
    items = list(rows)
    questions = []
    for item in items:
        question = item.question
        entry = {
            "position": item.position,
            "question_id": question.id,
            "code": question.code,
            "topic": question.topic.name,
            "skill": question.skill,
            "difficulty": question.difficulty,
            "text": question.text,
            "options": question.options,
            "selected_index": item.selected_index,
            "is_repeat": item.is_repeat,
        }
        if reveal:
            entry.update(
                {
                    "correct_index": question.correct_index,
                    "is_correct": item.is_correct,
                    "explanation": question.explanation,
                }
            )
        questions.append(entry)

    view = {
        "attempt_id": attempt.id,
        "course_id": attempt.course_id,
        "topic_id": attempt.topic_id,
        "kind": attempt.kind,
        "status": attempt.status,
        "difficulty": attempt.difficulty,
        "question_count": len(items),
        "answered_count": sum(1 for item in items if item.selected_index is not None),
        "pool_note": attempt.pool_note,
        "started_at": attempt.started_at,
        "submitted_at": attempt.submitted_at,
        "questions": questions,
    }
    if reveal:
        breakdown = attempt_breakdown(attempt.id)
        view.update(
            {
                "score_percent": attempt.score_percent,
                "correct_count": attempt.correct_count,
                "incorrect_count": attempt.incorrect_count,
                "unanswered_count": attempt.unanswered_count,
                "topic_breakdown": breakdown,
                **attempt_analysis(breakdown),
            }
        )
    return view


@router.post("", status_code=201)
def start_attempt(payload: AttemptStartIn, user: CurrentUser):
    course = get_or_404(Course, payload.course_id, "Course not found.")
    if not course.is_published:
        raise HTTPException(404, "Course not found.")
    # A test can cover one topic, several picked topics, or the whole course.
    wanted = list(dict.fromkeys(payload.topic_ids or ([payload.topic_id] if payload.topic_id is not None else [])))
    chosen = list(Topic.select().where(Topic.id.in_(wanted))) if wanted else []
    if len(chosen) != len(wanted):
        raise HTTPException(404, "Topic not found.")
    if any(t.course_id != course.id for t in chosen):
        raise HTTPException(400, "That topic belongs to a different course.")
    topic = chosen[0] if len(chosen) == 1 else None

    open_attempt = Attempt.get_or_none(
        (Attempt.user == user) & (Attempt.course == course) & (Attempt.status == "in_progress")
    )
    if open_attempt is not None:
        raise HTTPException(
            409,
            f"You already have an unfinished test for this course (test {open_attempt.id}). "
            "Finish or resume it before starting another.",
        )

    selection = select_questions(
        user,
        course.id,
        payload.count,
        payload.mode,
        topic.id if topic else None,
        payload.difficulty,
        only_topics=wanted or None,
    )
    if not selection.questions:
        raise HTTPException(409, selection.note)

    with database.atomic():
        attempt = Attempt.create(
            user=user,
            course=course,
            topic=topic,
            kind=payload.mode,
            difficulty=payload.difficulty,
            status="in_progress",
            requested_count=payload.count,
            question_count=len(selection.questions),
            pool_note=selection.note,
        )
        for position, question in enumerate(selection.questions, start=1):
            AttemptItem.create(
                attempt=attempt,
                question=question,
                position=position,
                is_repeat=question.id in selection.repeat_ids,
            )
    return _attempt_view(attempt, reveal=False)


@router.get("")
def list_attempts(user: CurrentUser, course_id: int | None = None):
    query = Attempt.select().where(Attempt.user == user).order_by(Attempt.started_at.desc())
    if course_id is not None:
        query = query.where(Attempt.course == course_id)
    return [
        {
            "attempt_id": a.id,
            "course_id": a.course_id,
            "kind": a.kind,
            "status": a.status,
            "started_at": a.started_at,
            "submitted_at": a.submitted_at,
            "score_percent": a.score_percent if a.status == "submitted" else None,
            "question_count": a.question_count,
            "correct_count": a.correct_count if a.status == "submitted" else None,
            "pool_note": a.pool_note,
        }
        for a in query
    ]


@router.get("/{attempt_id}")
def get_attempt(attempt_id: int, user: CurrentUser):
    attempt = _own_attempt(attempt_id, user)
    return _attempt_view(attempt, reveal=attempt.status == "submitted")


@router.put("/{attempt_id}/answers/{position}")
def save_answer(attempt_id: int, position: int, payload: AnswerIn, user: CurrentUser):
    attempt = _own_attempt(attempt_id, user)
    if attempt.status != "in_progress":
        raise HTTPException(409, "This test has already been submitted.")
    item = (
        AttemptItem.select(AttemptItem, Question)
        .join(Question, on=(AttemptItem.question == Question.id))
        .where((AttemptItem.attempt == attempt) & (AttemptItem.position == position))
        .first()
    )
    if item is None:
        raise HTTPException(404, "That question is not part of this test.")
    if payload.selected_index is not None and payload.selected_index >= len(item.question.options):
        raise HTTPException(422, "Choose one of the options shown.")
    item.selected_index = payload.selected_index
    item.save(only=[AttemptItem.selected_index, AttemptItem.updated_at])
    return {"position": position, "selected_index": item.selected_index}


@router.post("/{attempt_id}/submit")
def submit(attempt_id: int, user: CurrentUser):
    attempt = _own_attempt(attempt_id, user)
    if attempt.status == "submitted":
        raise HTTPException(409, "This test has already been submitted.")
    submit_attempt(attempt)
    recommendations.refresh(user, attempt.course)
    return _attempt_view(attempt, reveal=True)
