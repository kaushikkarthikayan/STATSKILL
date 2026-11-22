"""Creates, updates, removes and imports MCQs. The API and the import script use the same rules."""

import uuid

from fastapi import HTTPException

from app.db.database import database
from app.db.models import AttemptItem, Question, Topic, User
from app.schemas import QuestionIn


def new_question_code() -> str:
    return f"Q-{uuid.uuid4().hex[:10].upper()}"


def _topic_or_404(topic_id: int) -> Topic:
    topic = Topic.get_or_none(Topic.id == topic_id)
    if topic is None:
        raise HTTPException(404, "Topic not found.")
    return topic


def create_question(data: QuestionIn, creator: User | None) -> Question:
    topic = _topic_or_404(data.topic_id)
    code = data.code or new_question_code()
    if Question.select().where(Question.code == code).exists():
        raise HTTPException(409, f"A question with the code {code} already exists.")
    return Question.create(
        code=code,
        topic=topic,
        skill=data.skill,
        difficulty=data.difficulty,
        text=data.text,
        options=data.options,
        correct_index=data.correct_index,
        explanation=data.explanation,
        is_sample=data.is_sample,
        is_active=data.is_active,
        created_by=creator.id if creator else None,
    )


def update_question(question: Question, changes: dict) -> Question:
    if changes.get("topic_id") is not None:
        question.topic = _topic_or_404(changes["topic_id"])
    for field in ("skill", "difficulty", "text", "explanation", "is_active"):
        if changes.get(field) is not None:
            setattr(question, field, changes[field])
    if "options" in changes or "correct_index" in changes:
        options = [o.strip() for o in changes.get("options") or question.options]
        correct = changes.get("correct_index", question.correct_index)
        if len(options) < 2 or any(not o for o in options):
            raise HTTPException(422, "A question needs at least two options, and none can be empty.")
        if len({o.lower() for o in options}) != len(options):
            raise HTTPException(422, "Options must be different from each other.")
        if correct is None or not 0 <= correct < len(options):
            raise HTTPException(422, "The correct answer must match one of the options.")
        question.options = options
        question.correct_index = correct
    question.save()
    return question


def remove_question(question: Question) -> str:
    """Questions a student has already answered are deactivated, so past results stay accurate."""
    if AttemptItem.select().where(AttemptItem.question == question).exists():
        question.is_active = False
        question.save()
        return "deactivated"
    question.delete_instance(recursive=True)
    return "deleted"


def import_questions(rows: list[QuestionIn], creator: User | None) -> dict:
    """Creates or updates questions by code, so importing the same file twice never duplicates them."""
    created = updated = 0
    with database.atomic():
        for row in rows:
            if not row.code:
                raise HTTPException(422, "Every imported question needs a code, so re-imports update instead of duplicating.")
            topic = _topic_or_404(row.topic_id)
            fields = {
                "topic": topic,
                "skill": row.skill,
                "difficulty": row.difficulty,
                "text": row.text,
                "options": row.options,
                "correct_index": row.correct_index,
                "explanation": row.explanation,
                "is_sample": row.is_sample,
                "is_active": row.is_active,
            }
            existing = Question.get_or_none(Question.code == row.code)
            if existing is None:
                Question.create(code=row.code, created_by=creator.id if creator else None, **fields)
                created += 1
            else:
                for name, value in fields.items():
                    setattr(existing, name, value)
                existing.save()
                updated += 1
    return {"created": created, "updated": updated}
