"""Test fixtures. Every test run uses its own temporary database and upload folder."""

import os
import tempfile
from pathlib import Path

# These must be set before the app modules are imported, because settings are read at import time.
_TEMP_DIR = Path(tempfile.mkdtemp(prefix="statskill-tests-"))
os.environ.update(
    {
        "DB_ENGINE": "sqlite",
        "SQLITE_PATH": str(_TEMP_DIR / "test.db"),
        "UPLOAD_DIR": str(_TEMP_DIR / "uploads"),
        "SECRET_KEY": "automated-test-secret-key-that-is-long-enough-0123456789",
        "PRINT_RESET_LINKS": "false",
        "MAX_UPLOAD_MB": "1",
    }
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.database import database  # noqa: E402
from app.db.models import ALL_MODELS  # noqa: E402
from app.main import app  # noqa: E402
from app.services.accounts import ensure_admin  # noqa: E402
from tests.helpers import ADMIN_PASSWORD, auth, register_student  # noqa: E402


@pytest.fixture()
def client():
    database.drop_tables(ALL_MODELS, safe=True)
    database.create_tables(ALL_MODELS)
    with TestClient(app) as test_client:
        yield test_client
    database.drop_tables(ALL_MODELS, safe=True)


@pytest.fixture()
def admin(client):
    ensure_admin("admin@example.com", "Site Administrator", ADMIN_PASSWORD)
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"token": token, "headers": auth(token)}


@pytest.fixture()
def student(client):
    return register_student(client)


@pytest.fixture()
def catalog(client, admin):
    """One published course with two topics.

    Topic A (Descriptive) has 6 questions and topic B (Probability) has 4.
    Option 0 is always correct, so tests can choose right or wrong answers on purpose.
    """
    course = client.post(
        "/api/courses",
        json={
            "name": "Statistics Test Course",
            "description": "Course used by the automated tests",
            "level": "beginner",
            "duration_weeks": 4,
            "required_skills": ["Data summary", "Probability reasoning"],
            "is_published": True,
        },
        headers=admin["headers"],
    ).json()
    topic_a = client.post(
        f"/api/courses/{course['id']}/topics",
        json={"name": "Descriptive", "skill_area": "Data summary", "learning_objectives": ["Mean"]},
        headers=admin["headers"],
    ).json()
    topic_b = client.post(
        f"/api/courses/{course['id']}/topics",
        json={"name": "Probability", "skill_area": "Probability reasoning"},
        headers=admin["headers"],
    ).json()

    question_ids = {"A": [], "B": []}
    for label, topic, count in (("A", topic_a, 6), ("B", topic_b, 4)):
        for number in range(1, count + 1):
            response = client.post(
                "/api/questions",
                json={
                    "topic_id": topic["id"],
                    "skill": topic["skill_area"],
                    "difficulty": "easy",
                    "text": f"Topic {label} question {number}?",
                    "options": ["Right", "Wrong", "Other", "Nope"],
                    "correct_index": 0,
                    "explanation": f"Explanation for {label}{number}",
                },
                headers=admin["headers"],
            )
            assert response.status_code == 201, response.text
            question_ids[label].append(response.json()["id"])

    return {
        "course_id": course["id"],
        "topic_a": topic_a["id"],
        "topic_b": topic_b["id"],
        "questions": question_ids,
    }
