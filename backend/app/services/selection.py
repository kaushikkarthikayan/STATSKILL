"""Chooses the questions for a test or practice set.

Rules that keep the question bank fair:
- No question appears twice in the same set.
- Questions the student has never seen are used first.
- Earlier questions are added only when new ones run out. The student is told when this happens
  and the repeated questions are marked. Nothing is generated or presented as new.
- Revision sets start with questions the student got wrong last time, in the weakest topics.
"""

import random
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime

from app.db.models import Question, QuestionHistory, Topic, User


@dataclass
class Selection:
    questions: list = field(default_factory=list)
    repeat_ids: set = field(default_factory=set)
    new_available: int = 0
    total_available: int = 0
    note: str = ""


def _interleave(lists: list[list], limit: int) -> list:
    """Takes one item from each list in turn, so topics are mixed, up to `limit` items."""
    chosen: list = []
    positions = [0] * len(lists)
    while len(chosen) < limit:
        moved = False
        for i, items in enumerate(lists):
            if positions[i] < len(items) and len(chosen) < limit:
                chosen.append(items[positions[i]])
                positions[i] += 1
                moved = True
        if not moved:
            break
    return chosen


def _topic_accuracy(questions: list, history: dict) -> float:
    seen = sum(history[q.id].times_seen for q in questions if q.id in history)
    correct = sum(history[q.id].times_correct for q in questions if q.id in history)
    return correct / seen if seen else 0.5


def _tiers(questions: list, history: dict, mode: str) -> list[list]:
    """Splits one topic's questions into priority tiers. Earlier tiers are used first."""
    unseen = [q for q in questions if q.id not in history]
    wrong_last = [q for q in questions if q.id in history and history[q.id].last_correct is False]
    right_last = [q for q in questions if q.id in history and history[q.id].last_correct is not False]
    random.shuffle(unseen)
    random.shuffle(wrong_last)
    right_last.sort(key=lambda q: history[q.id].last_seen_at or datetime.min)
    if mode == "revision":
        return [wrong_last, unseen, right_last]
    return [unseen, wrong_last, right_last]


def select_questions(
    user: User,
    course_id: int,
    count: int,
    mode: str = "assessment",
    topic_id: int | None = None,
    difficulty: str | None = None,
    only_topics: list[int] | None = None,
) -> Selection:
    query = (
        Question.select(Question, Topic)
        .join(Topic, on=(Question.topic == Topic.id))
        .where((Topic.course == course_id) & (Question.is_active == True))  # noqa: E712
    )
    if only_topics:
        query = query.where(Question.topic.in_(only_topics))
    elif topic_id is not None:
        query = query.where(Question.topic == topic_id)
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    candidates = list(query)
    if not candidates:
        return Selection(note="No active questions match this selection yet. Ask an administrator to add questions.")

    history = {h.question_id: h for h in QuestionHistory.select().where(QuestionHistory.user == user)}
    by_topic: dict[int, list] = defaultdict(list)
    for question in candidates:
        by_topic[question.topic_id].append(question)

    topic_ids = list(by_topic)
    if mode == "revision":
        topic_ids.sort(key=lambda t: _topic_accuracy(by_topic[t], history))
    else:
        random.shuffle(topic_ids)
    tiers = {t: _tiers(by_topic[t], history, mode) for t in topic_ids}

    chosen: list = []
    for tier in range(3):
        remaining = count - len(chosen)
        if remaining <= 0:
            break
        chosen += _interleave([tiers[t][tier] for t in topic_ids], remaining)

    unseen_total = sum(1 for q in candidates if q.id not in history)
    repeat_ids = {q.id for q in chosen if q.id in history}
    notes = []
    if len(candidates) < count:
        notes.append(f"Only {len(candidates)} question(s) exist for this selection, so this set has {len(chosen)}.")
    if unseen_total == 0:
        notes.append(
            "You have already seen every question in this selection. "
            "The questions below are repeats; no new questions were generated."
        )
    elif repeat_ids:
        notes.append(
            f"Only {unseen_total} new question(s) were left, so {len(repeat_ids)} earlier question(s) "
            "were added. They are marked as repeats."
        )
    return Selection(
        questions=chosen,
        repeat_ids=repeat_ids,
        new_available=unseen_total,
        total_available=len(candidates),
        note=" ".join(notes),
    )
