"""Loads the sample Statistics course and its starter MCQs from data/sample_questions.json.

The questions are marked is_sample=true. They are starter content only: replace them with
verified questions before real students use the platform.
Running this twice is safe: questions are matched by code and updated, never duplicated.

Run from the backend folder:
    .venv\\Scripts\\python.exe scripts\\import_sample_course.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.models import Course, Topic  # noqa: E402
from app.db.setup import init_database  # noqa: E402
from app.schemas import QuestionIn  # noqa: E402
from app.services.common import slugify  # noqa: E402
from app.services.questions import import_questions  # noqa: E402

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "sample_questions.json"


def main() -> int:
    init_database()
    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    course_info = payload["course"]
    course, course_created = Course.get_or_create(
        name=course_info["name"],
        defaults={
            "slug": slugify(course_info["name"]),
            "description": course_info["description"],
            "level": course_info["level"],
            "duration_weeks": course_info["duration_weeks"],
            "required_skills": course_info["required_skills"],
            "is_published": True,
        },
    )

    topic_by_key = {}
    topics_created = 0
    for item in payload["topics"]:
        topic, created = Topic.get_or_create(
            course=course,
            slug=slugify(item["name"]),
            defaults={
                "name": item["name"],
                "skill_area": item["skill_area"],
                "description": item["description"],
                "learning_objectives": item["learning_objectives"],
            },
        )
        topics_created += int(created)
        topic_by_key[item["key"]] = topic

    rows = [
        QuestionIn(
            topic_id=topic_by_key[q["topic"]].id,
            code=q["code"],
            skill=q["skill"],
            difficulty=q["difficulty"],
            text=q["text"],
            options=q["options"],
            correct_index=q["correct_index"],
            explanation=q.get("explanation", ""),
            is_sample=True,
        )
        for q in payload["questions"]
    ]
    result = import_questions(rows, creator=None)
    print(
        f"Course '{course.name}': {'created' if course_created else 'already existed'}. "
        f"Topics created: {topics_created}. Questions created: {result['created']}, "
        f"updated: {result['updated']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
