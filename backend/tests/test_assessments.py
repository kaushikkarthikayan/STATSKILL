"""Tests and practice: automatic scoring, no-repeat selection, exhausted pools, revision and privacy."""

from tests.flows import answer_and_submit, start_attempt
from tests.helpers import register_student


def test_assessment_is_scored_and_saved(client, student, catalog):
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    assert attempt["question_count"] == 10
    assert all("correct_index" not in q for q in attempt["questions"])  # answers stay hidden during a test

    result = answer_and_submit(client, student, attempt, lambda pos: 0 if pos <= 7 else 1)
    assert result["status"] == "submitted"
    assert result["correct_count"] == 7
    assert result["incorrect_count"] == 3
    assert result["unanswered_count"] == 0
    assert result["score_percent"] == 70.0
    assert all("correct_index" in q for q in result["questions"])  # answers are shown after submission

    breakdown = {t["topic"]: t for t in result["topic_breakdown"]}
    assert breakdown["Descriptive"]["total"] == 6
    assert breakdown["Probability"]["total"] == 4
    assert sum(t["correct"] for t in breakdown.values()) == 7

    history = client.get("/api/assessments", headers=student["headers"]).json()
    assert len(history) == 1
    assert history[0]["score_percent"] == 70.0


def test_unanswered_questions_are_counted_as_incorrect(client, student, catalog):
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=4)
    result = answer_and_submit(client, student, attempt, lambda pos: 0 if pos == 1 else None)
    assert result["correct_count"] == 1
    assert result["unanswered_count"] == 3
    assert result["score_percent"] == 25.0


def test_answer_must_be_one_of_the_options(client, student, catalog):
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=2)
    response = client.put(
        f"/api/assessments/{attempt['attempt_id']}/answers/1",
        json={"selected_index": 5},
        headers=student["headers"],
    )
    assert response.status_code == 422


def test_questions_do_not_repeat_and_new_ones_come_first(client, student, catalog):
    all_ids = set(catalog["questions"]["A"] + catalog["questions"]["B"])

    first = start_attempt(client, student, course_id=catalog["course_id"], count=5)
    ids_first = [q["question_id"] for q in first["questions"]]
    assert len(set(ids_first)) == 5
    assert not any(q["is_repeat"] for q in first["questions"])
    answer_and_submit(client, student, first, lambda pos: 0)

    second = start_attempt(client, student, course_id=catalog["course_id"], count=5)
    ids_second = [q["question_id"] for q in second["questions"]]
    assert len(set(ids_second)) == 5
    assert set(ids_first).isdisjoint(ids_second), "a new set should use questions not seen before"
    assert not any(q["is_repeat"] for q in second["questions"])
    answer_and_submit(client, student, second, lambda pos: 0)

    # Every question has now been seen once. The next set must reuse some and say so.
    assert set(ids_first) | set(ids_second) == all_ids
    third = start_attempt(client, student, course_id=catalog["course_id"], count=5)
    ids_third = [q["question_id"] for q in third["questions"]]
    assert len(set(ids_third)) == 5
    assert all(q["is_repeat"] for q in third["questions"])
    assert "no new questions were generated" in third["pool_note"]


def test_short_question_bank_is_reported(client, student, catalog):
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=20)
    assert attempt["question_count"] == 10
    assert "Only 10 question(s) exist" in attempt["pool_note"]


def test_only_one_unfinished_test_per_course(client, student, catalog):
    start_attempt(client, student, course_id=catalog["course_id"], count=3)
    second = client.post(
        "/api/assessments",
        json={"course_id": catalog["course_id"], "count": 3},
        headers=student["headers"],
    )
    assert second.status_code == 409


def test_revision_starts_with_questions_answered_wrongly(client, student, catalog):
    first = start_attempt(client, student, course_id=catalog["course_id"], count=5)
    wrong_ids = {q["question_id"] for q in first["questions"]}
    answer_and_submit(client, student, first, lambda pos: 1)  # every answer is wrong

    revision = start_attempt(client, student, course_id=catalog["course_id"], mode="revision", count=3)
    assert revision["kind"] == "revision"
    assert all(q["question_id"] in wrong_ids for q in revision["questions"])
    assert all(q["is_repeat"] for q in revision["questions"])


def test_students_only_see_their_own_tests(client, student, catalog):
    other = register_student(client, email="other@example.com", name="Other Student")
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=3)
    assert client.get(f"/api/assessments/{attempt['attempt_id']}", headers=other["headers"]).status_code == 404
    assert client.get("/api/assessments", headers=other["headers"]).json() == []


def test_question_used_in_a_test_is_deactivated_not_deleted(client, admin, student, catalog):
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=2)
    used_id = attempt["questions"][0]["question_id"]
    answer_and_submit(client, student, attempt, lambda pos: 0)

    response = client.delete(f"/api/questions/{used_id}", headers=admin["headers"])
    assert response.json()["outcome"] == "deactivated"
    kept = client.get(f"/api/questions/{used_id}", headers=admin["headers"]).json()
    assert kept["is_active"] is False
