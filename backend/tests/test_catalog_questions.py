"""Courses, topics, question management and the student profile."""

from tests.helpers import register_student


def test_only_staff_can_add_questions(client, admin, student, catalog):
    payload = {
        "topic_id": catalog["topic_a"],
        "text": "Can a student add this question?",
        "options": ["Yes", "No"],
        "correct_index": 0,
    }
    assert client.post("/api/questions", json=payload, headers=student["headers"]).status_code == 403
    assert client.post("/api/questions", json=payload, headers=admin["headers"]).status_code == 201


def test_question_codes_are_unique_and_answers_are_validated(client, admin, catalog):
    base = {
        "topic_id": catalog["topic_a"],
        "text": "Duplicate code check?",
        "options": ["A", "B"],
        "correct_index": 1,
        "code": "DUP-001",
    }
    first = client.post("/api/questions", json=base, headers=admin["headers"])
    second = client.post("/api/questions", json=base, headers=admin["headers"])
    assert first.status_code == 201
    assert second.status_code == 409

    generated = client.post("/api/questions", json={**base, "code": None}, headers=admin["headers"])
    assert generated.status_code == 201
    assert generated.json()["code"].startswith("Q-")

    out_of_range = client.post(
        "/api/questions",
        json={**base, "code": "BAD-002", "correct_index": 5},
        headers=admin["headers"],
    )
    assert out_of_range.status_code == 422


def test_unpublished_courses_are_hidden_from_students(client, admin, student):
    hidden = client.post(
        "/api/courses",
        json={"name": "Hidden Course", "is_published": False},
        headers=admin["headers"],
    ).json()
    listed = client.get("/api/courses", headers=student["headers"]).json()
    assert all(course["id"] != hidden["id"] for course in listed)
    assert client.get(f"/api/courses/{hidden['id']}", headers=student["headers"]).status_code == 404
    assert client.get(f"/api/courses/{hidden['id']}", headers=admin["headers"]).status_code == 200


def test_profile_saves_course_and_interests(client, catalog, student):
    response = client.put(
        "/api/profile",
        json={
            "college": "City College",
            "graduation_year": 2027,
            "current_course_id": catalog["course_id"],
            "interests": ["Statistics", "Data"],
            "bio": "Preparing for exams",
        },
        headers=student["headers"],
    )
    assert response.status_code == 200, response.text
    assert response.json()["current_course"]["id"] == catalog["course_id"]

    saved = client.get("/api/profile", headers=student["headers"]).json()
    assert saved["interests"] == ["Statistics", "Data"]
    assert saved["graduation_year"] == 2027


def test_students_cannot_change_each_others_profiles(client, catalog, student):
    other = register_student(client, email="other@example.com", name="Other Student")
    client.put("/api/profile", json={"college": "Only Mine"}, headers=student["headers"])
    other_profile = client.get("/api/profile", headers=other["headers"]).json()
    assert other_profile["college"] is None
