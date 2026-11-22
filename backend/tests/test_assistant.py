"""The study buddy only repeats the student's own stored numbers."""

from tests.flows import answer_and_submit, start_attempt


def ask(client, student, text):
    response = client.post("/api/assistant/ask", json={"question": text}, headers=student["headers"])
    assert response.status_code == 200, response.text
    return response.json()["answer"]


def test_buddy_needs_a_course_first(client, student):
    assert "profile" in ask(client, student, "How am I doing?")


def test_buddy_answers_from_real_results(client, student, catalog):
    client.put("/api/profile", json={"current_course_id": catalog["course_id"]}, headers=student["headers"])
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    answer_and_submit(client, student, attempt, lambda pos: 0)
    assert "10 of 10" in ask(client, student, "How am I doing?")
    assert "streak is 1" in ask(client, student, "what is my streak")
    assert "I can help with" in ask(client, student, "tell me a joke")


def test_buddy_requires_login_and_a_question(client, student):
    assert client.post("/api/assistant/ask", json={"question": "hi"}).status_code in (401, 403)
    assert client.post("/api/assistant/ask", json={"question": ""}, headers=student["headers"]).status_code == 422


def test_buddy_greets_and_understands_plan_work(client, student, catalog):
    assert "Hii Asha" in ask(client, student, "hii")
    client.put("/api/profile", json={"current_course_id": catalog["course_id"]}, headers=student["headers"])
    plan = ask(client, student, "plan my work")
    assert "Plan for today" in plan and "last 7 days" in plan


def test_buddy_points_out_real_mistakes(client, student, catalog):
    assert "no wrong answers" in ask(client, student, "point out my mistakes")
    client.put("/api/profile", json={"current_course_id": catalog["course_id"]}, headers=student["headers"])
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    answer_and_submit(client, student, attempt, lambda pos: 1)  # every answer wrong
    said = client.post("/api/assistant/ask", json={"question": "point out my mistake"}, headers=student["headers"]).json()
    assert "recent mistakes" in said["answer"] and "the correct answer is" in said["answer"]
    assert said["actions"][0]["link"].startswith("/training/topic/")