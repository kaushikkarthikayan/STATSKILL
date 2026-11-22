"""MCQ management for content creators and administrators: add, edit, remove, import and list."""

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CreatorUser
from app.db.models import Question, Topic
from app.schemas import QuestionIn, QuestionUpdate
from app.services.common import get_or_404
from app.services.questions import create_question, import_questions, remove_question, update_question

router = APIRouter(prefix="/questions", tags=["MCQ management"])


def question_out(question: Question) -> dict:
    topic = question.topic
    return {
        "id": question.id,
        "code": question.code,
        "topic_id": topic.id,
        "topic": topic.name,
        "course_id": topic.course_id,
        "skill": question.skill,
        "difficulty": question.difficulty,
        "text": question.text,
        "options": question.options,
        "correct_index": question.correct_index,
        "explanation": question.explanation,
        "is_sample": question.is_sample,
        "is_active": question.is_active,
    }


@router.get("")
def list_questions(
    user: CreatorUser,
    course_id: int | None = Query(default=None, gt=0),
    topic_id: int | None = Query(default=None, gt=0),
    difficulty: str | None = Query(default=None, pattern="^(easy|medium|hard)$"),
    skill: str | None = Query(default=None, max_length=80),
    active: bool | None = None,
    q: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = Question.select(Question, Topic).join(Topic, on=(Question.topic == Topic.id))
    if course_id is not None:
        query = query.where(Topic.course == course_id)
    if topic_id is not None:
        query = query.where(Question.topic == topic_id)
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    if skill:
        query = query.where(Question.skill == skill)
    if active is not None:
        query = query.where(Question.is_active == active)
    if q:
        query = query.where(Question.text.contains(q) | Question.code.contains(q))
    total = query.count()
    rows = query.order_by(Question.id).limit(limit).offset(offset)
    return {"total": total, "items": [question_out(row) for row in rows]}


@router.get("/{question_id}")
def get_question(question_id: int, user: CreatorUser):
    return question_out(get_or_404(Question, question_id, "Question not found."))


@router.post("", status_code=201)
def add_question(payload: QuestionIn, user: CreatorUser):
    return question_out(create_question(payload, user))


@router.put("/{question_id}")
def edit_question(question_id: int, payload: QuestionUpdate, user: CreatorUser):
    question = get_or_404(Question, question_id, "Question not found.")
    return question_out(update_question(question, payload.model_dump(exclude_unset=True)))


@router.delete("/{question_id}")
def delete_question(question_id: int, user: CreatorUser):
    question = get_or_404(Question, question_id, "Question not found.")
    outcome = remove_question(question)
    if outcome == "deleted":
        message = "Question deleted."
    else:
        message = (
            "This question has already been used in tests, so it was deactivated instead of deleted. "
            "Students will no longer receive it."
        )
    return {"message": message, "outcome": outcome}


@router.post("/import")
def import_bank(rows: list[QuestionIn], user: CreatorUser):
    if not rows or len(rows) > 500:
        raise HTTPException(422, "Send between 1 and 500 questions per import.")
    result = import_questions(rows, user)
    return {"message": "Import finished.", **result}
