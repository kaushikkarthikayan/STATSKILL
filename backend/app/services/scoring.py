"""Marks a submitted test and keeps each student's question history up to date."""

from app.db.database import database, utcnow
from app.db.models import Attempt, AttemptItem, Question, QuestionHistory, Topic
from app.services.common import accuracy, status_for


def submit_attempt(attempt: Attempt) -> Attempt:
    """Scores every item, updates question history and closes the attempt. Runs in one transaction."""
    now = utcnow()
    with database.atomic():
        items = list(
            AttemptItem.select(AttemptItem, Question)
            .join(Question, on=(AttemptItem.question == Question.id))
            .where(AttemptItem.attempt == attempt.id)
        )
        correct = incorrect = unanswered = 0
        for item in items:
            if item.selected_index is None:
                item.is_correct = False
                unanswered += 1
            else:
                item.is_correct = item.selected_index == item.question.correct_index
                if item.is_correct:
                    correct += 1
                else:
                    incorrect += 1
            item.save(only=[AttemptItem.is_correct, AttemptItem.updated_at])

            history = QuestionHistory.get_or_none(
                (QuestionHistory.user == attempt.user_id) & (QuestionHistory.question == item.question_id)
            )
            if history is None:
                history = QuestionHistory(user=attempt.user_id, question=item.question_id)
            history.times_seen += 1
            history.times_correct += 1 if item.is_correct else 0
            history.last_correct = bool(item.is_correct)
            history.last_seen_at = now
            history.save()

        total = len(items)
        attempt.question_count = total
        attempt.correct_count = correct
        attempt.incorrect_count = incorrect
        attempt.unanswered_count = unanswered
        attempt.score_percent = round(100.0 * correct / total, 1) if total else 0.0
        attempt.status = "submitted"
        attempt.submitted_at = now
        attempt.save()
    return attempt


def attempt_breakdown(attempt_id: int) -> list[dict]:
    """Topic-by-topic result of one test. Unanswered questions count as incorrect."""
    rows = (
        AttemptItem.select(AttemptItem, Question, Topic)
        .join(Question, on=(AttemptItem.question == Question.id))
        .join(Topic, on=(Question.topic == Topic.id))
        .where(AttemptItem.attempt == attempt_id)
    )
    buckets: dict[int, dict] = {}
    for item in rows:
        topic = item.question.topic
        bucket = buckets.setdefault(
            topic.id,
            {
                "topic_id": topic.id,
                "topic": topic.name,
                "skill_area": topic.skill_area,
                "total": 0,
                "correct": 0,
                "unanswered": 0,
            },
        )
        bucket["total"] += 1
        bucket["correct"] += 1 if item.is_correct else 0
        bucket["unanswered"] += 1 if item.selected_index is None else 0

    result = []
    for bucket in buckets.values():
        percent = accuracy(bucket["correct"], bucket["total"])
        bucket["accuracy_percent"] = percent
        # One test is judged on its own answers, so no minimum number of answers applies here.
        bucket["status"] = status_for(percent, bucket["total"], min_evidence=1)
        result.append(bucket)
    return sorted(result, key=lambda b: b["topic"])


def attempt_analysis(breakdown: list[dict]) -> dict:
    """Strong areas, weak areas, missing skills and suggestions. Built only from this test's answers."""
    suggestions = []
    for b in breakdown:
        if b["status"] == "weak":
            suggestions.append(
                f"Revise {b['topic']}: {b['correct']} of {b['total']} correct. "
                "Study its material, then take a revision set."
            )
        elif b["status"] == "developing":
            suggestions.append(f"Practise {b['topic']} more: {b['correct']} of {b['total']} correct.")
        if b["unanswered"] and b["unanswered"] == b["total"]:
            suggestions.append(f"You did not answer any {b['topic']} questions. Try a practice set on this topic.")
    return {
        "strong_areas": [b["topic"] for b in breakdown if b["status"] == "strong"],
        "weak_areas": [b["topic"] for b in breakdown if b["status"] in ("weak", "developing")],
        "missing_skills": [b["topic"] for b in breakdown if b["status"] == "weak"],
        "suggestions": suggestions,
    }
