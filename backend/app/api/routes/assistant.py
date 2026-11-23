"""Study buddy: manages the student's progress using fixed rules and their own stored results.

It is not a language model. Every number and every mistake it mentions comes from the database,
and anything it cannot answer gets a friendly list of what it can.
"""

import re
from collections import Counter

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser
from app.db.models import Attempt, AttemptItem, Question, Topic
from app.services.common import ensure_profile
from app.services.learning import learning_overview

router = APIRouter(prefix="/assistant", tags=["Study buddy"])

RANKS = ["Rookie", "Explorer", "Apprentice", "Thinker", "Problem Solver", "Analyst", "Strategist", "Expert", "Master", "Legend"]
SUGGESTIONS = ["Plan my work", "Point out my mistakes", "What is my level?", "How am I doing?", "Which topics are weak?", "What is my streak?"]


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=300)


def _has(q: str, *words: str) -> bool:
    return any(re.search(rf"\b{re.escape(w)}", q) for w in words)


def _xp(stats: dict) -> dict:
    """XP = 10 per correct answer + 25 per submitted test. Level n starts at 60 * (n - 1)^2 XP."""
    xp = stats["correct"] * 10 + stats["tests_submitted"] * 25
    level = int((xp / 60) ** 0.5) + 1
    start, nxt = 60 * (level - 1) ** 2, 60 * level**2
    return {
        "xp": xp,
        "level": level,
        "rank": RANKS[min(level - 1, len(RANKS) - 1)],
        "level_start": start,
        "next_level_at": nxt,
        "percent_to_next": round(100 * (xp - start) / (nxt - start)),
    }


def _actions(data: dict) -> list[dict]:
    """Buttons the bot offers, taken from the student's own next steps."""
    items = [{"label": s["title"], "link": s["link"]} for s in (data.get("up_next") or [])[:3]]
    return items or [{"label": "Open course training", "link": "/training"}]


def _mistakes(user) -> tuple[str, list[dict]]:
    """The student's real wrong answers from submitted tests, newest first, with the pattern behind them."""
    rows = list(
        AttemptItem.select(AttemptItem, Question)
        .join(Attempt, on=(AttemptItem.attempt == Attempt.id))
        .switch(AttemptItem)
        .join(Question, on=(AttemptItem.question == Question.id))
        .where(
            (Attempt.user == user.id)
            & (Attempt.status == "submitted")
            & (AttemptItem.is_correct == False)  # noqa: E712
            & (AttemptItem.selected_index.is_null(False))
        )
        .order_by(Attempt.submitted_at.desc(), AttemptItem.position)
        .limit(40)
    )
    if not rows:
        return "I see no wrong answers yet. Submit a test and I will point out exactly where you slipped.", []
    topic_id, count = Counter(r.question.topic_id for r in rows).most_common(1)[0]
    topic = Topic.get_by_id(topic_id)
    lines = [f"Most of your recent mistakes are in {topic.name} ({count} of {len(rows)})."]
    for item in rows[:3]:
        q = item.question
        options = q.options or []
        mine = options[item.selected_index] if item.selected_index < len(options) else "?"
        right = options[q.correct_index] if q.correct_index < len(options) else "?"
        why = f" {q.explanation}" if q.explanation else ""
        lines.append(f"- {q.text[:110]} You chose \"{mine}\"; the correct answer is \"{right}\".{why}")
    lines.append("Revise that topic, then retry a few questions.")
    return "\n".join(lines), [{"label": f"Revise {topic.name}", "link": f"/training/topic/{topic_id}"}]


def _workflow(data: dict) -> str:
    """Reads the student's habits from their own results and turns them into a plan."""
    stats = data["stats"]
    topics = data.get("topics") or []
    notes = []
    days = sum(1 for d in stats["last_7_days"] if d["tests"])
    notes.append(f"You tested on {days} of the last 7 days" + (" (a steady rhythm)." if days >= 4 else ". Try for a little every day."))
    scores = [a["score_percent"] for a in reversed(data.get("assessments") or [])][-3:]
    if len(scores) >= 2:
        trend = "improving" if scores[-1] > scores[0] else "slipping" if scores[-1] < scores[0] else "flat"
        notes.append("Your last scores " + " > ".join(f"{round(s)}%" for s in scores) + f" are {trend}.")
    untouched = [t["name"] for t in topics if t["selected"] and t["state"] == "not_started"]
    if untouched:
        notes.append("In your plan but not started: " + ", ".join(untouched[:3]) + ".")
    weak = data.get("recommended_topics") or []
    if weak:
        notes.append("Needs revision: " + ", ".join(weak[:3]) + ".")
    steps = data.get("up_next") or []
    goal = 10 if stats["answers"] < 50 else 20
    plan = " ".join(f"{i + 1}. {s['title']}." for i, s in enumerate(steps[:3]))
    return "\n".join(notes + [f"Plan for today: answer about {goal} questions. {plan}"])


def _answer(question: str, data: dict, user) -> tuple[str, list[dict] | None]:
    q = question.lower().strip()
    first = user.full_name.split(" ")[0]
    stats = data["stats"]
    if _has(q, "hi", "hii", "hiii", "hello", "hey", "hola", "yo") and len(q.split()) <= 4:
        return f"Hii {first}! I am Arri, your study buddy. Ask me to plan your work or point out your mistakes.", None
    if _has(q, "mistake", "wrong", "error", "went wrong", "fail"):
        return _mistakes(user)
    if _has(q, "level", "xp", "rank"):
        info = _xp(stats)
        return f"You are level {info['level']} ({info['rank']}) with {info['xp']} XP. {info['next_level_at'] - info['xp']} XP to the next level.", None
    if data.get("course") is None:
        return "Pick the course you are preparing for in your profile first. Then I can manage your plan.", None
    progress = data["progress"]
    if _has(q, "plan", "work", "workflow", "schedule", "today", "organi", "habit", "routine"):
        return _workflow(data), None
    if _has(q, "weak", "improve", "struggle", "bad at", "recommend"):
        names = data.get("recommended_topics") or []
        if not names:
            return "No topic looks weak yet. I need more of your answers (at least 3 per topic) before I can say.", None
        return "Your answers say these need work: " + ", ".join(names) + ". Try a revision set on them.", None
    if _has(q, "next", "study", "continue", "start", "do now"):
        steps = data.get("up_next") or []
        if not steps:
            return "Take a fresh assessment to see where you stand.", None
        return "Next up: " + "; ".join(f"{s['title']} ({s['detail']})" for s in steps[:3]) + ".", None
    if _has(q, "streak"):
        return f"Your current streak is {stats['streak_days']} day(s). Your best is {stats['best_streak_days']}.", None
    if _has(q, "how am i", "progress", "score", "doing", "accuracy", "stats"):
        accuracy = "no answers yet" if stats["accuracy_percent"] is None else f"{round(stats['accuracy_percent'])}% accuracy"
        return (
            f"In {data['course']['name']} you have mastered {progress['mastered_questions']} of {progress['total_questions']} "
            f"questions ({round(progress['progress_percent'] or 0)}%), with {accuracy} and {stats['tests_submitted']} test(s) submitted."
        ), None
    return "I did not catch that, but I can help with: " + " | ".join(SUGGESTIONS), None


@router.get("/suggestions")
def suggestions(user: CurrentUser):
    return SUGGESTIONS


@router.post("/ask")
def ask(payload: AskIn, user: CurrentUser):
    data = learning_overview(user, ensure_profile(user))
    answer, actions = _answer(payload.question, data, user)
    return {"answer": answer, "actions": actions if actions is not None else _actions(data)}


@router.get("/briefing")
def briefing(user: CurrentUser):
    """A short status report shown when the bot opens: level, XP, streak, a message and what to do next."""
    data = learning_overview(user, ensure_profile(user))
    stats = data["stats"]
    first = user.full_name.split(" ")[0]
    if data.get("course") is None:
        message = f"Hii {first}! Choose your course in your profile and I will manage your plan."
    elif stats["tests_submitted"] == 0:
        message = f"Hii {first}! Take a first test so I can track your progress."
    elif stats["streak_days"] == 0:
        message = f"Hii {first}! Your streak is at zero. One short test today restarts it."
    else:
        message = f"Hii {first}! {stats['streak_days']}-day streak. Keep it going with today's next step."
    return {**_xp(stats), "streak_days": stats["streak_days"], "message": message, "actions": _actions(data)}
