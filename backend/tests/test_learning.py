"""Topic states, course completion, topic selection, the dashboard overview and the progress extras.

All numbers are checked against answers the test itself gives, so nothing here relies on made-up data.
"""

from tests.flows import answer_and_submit, start_attempt


def topics_of(client, student, catalog):
    response = client.get(f"/api/learning/topics?course_id={catalog['course_id']}", headers=student["headers"])
    assert response.status_code == 200, response.text
    return response.json()


def choose_course(client, student, catalog):
    response = client.put("/api/profile", json={"current_course_id": catalog["course_id"]}, headers=student["headers"])
    assert response.status_code == 200, response.text


def test_a_new_student_has_no_progress(client, student, catalog):
    data = topics_of(client, student, catalog)
    assert [t["state"] for t in data["topics"]] == ["not_started", "not_started"]
    assert [t["number"] for t in data["topics"]] == [1, 2]
    assert data["progress"]["progress_percent"] == 0.0
    assert data["progress"]["topics_not_started"] == 2
    assert all(t["mastered"] == 0 for t in data["topics"])


def test_topic_states_and_course_completion_follow_real_answers(client, student, catalog):
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    topic_of = {q["position"]: q["topic"] for q in attempt["questions"]}
    # Every Descriptive answer is right, every Probability answer is wrong.
    answer_and_submit(client, student, attempt, lambda pos: 0 if topic_of[pos] == "Descriptive" else 1)

    data = topics_of(client, student, catalog)
    by_name = {t["name"]: t for t in data["topics"]}
    assert by_name["Descriptive"]["state"] == "completed"
    assert by_name["Descriptive"]["mastered"] == 6
    assert by_name["Descriptive"]["progress_percent"] == 100.0
    assert by_name["Probability"]["state"] == "in_progress"  # all seen, none answered correctly yet
    assert by_name["Probability"]["progress_percent"] == 0.0
    assert data["progress"]["progress_percent"] == 60.0  # 6 of 10 questions mastered
    assert data["progress"]["topics_completed"] == 1
    assert data["progress"]["topics_in_progress"] == 1

    # Revising the missed topic and getting it right completes the course.
    revision = start_attempt(client, student, course_id=catalog["course_id"], mode="revision", topic_id=catalog["topic_b"], count=4)
    answer_and_submit(client, student, revision, lambda pos: 0)
    data = topics_of(client, student, catalog)
    assert all(t["state"] == "completed" for t in data["topics"])
    assert data["progress"]["progress_percent"] == 100.0


def test_topic_selection_is_saved_and_can_be_cleared(client, admin, student, catalog):
    headers = student["headers"]
    picked = client.put(f"/api/learning/topics/{catalog['topic_a']}/selection", json={"selected": True}, headers=headers)
    assert picked.status_code == 200
    selected = {t["name"]: t["selected"] for t in topics_of(client, student, catalog)["topics"]}
    assert selected == {"Descriptive": True, "Probability": False}

    both = client.put("/api/learning/selection", json={"course_id": catalog["course_id"], "topic_ids": [catalog["topic_a"], catalog["topic_b"]]}, headers=headers)
    assert both.status_code == 200
    assert all(t["selected"] for t in topics_of(client, student, catalog)["topics"])

    client.put(f"/api/learning/topics/{catalog['topic_a']}/selection", json={"selected": False}, headers=headers)
    selected = {t["name"]: t["selected"] for t in topics_of(client, student, catalog)["topics"]}
    assert selected == {"Descriptive": False, "Probability": True}

    cleared = client.put("/api/learning/selection", json={"course_id": catalog["course_id"], "topic_ids": []}, headers=headers)
    assert cleared.status_code == 200
    assert not any(t["selected"] for t in topics_of(client, student, catalog)["topics"])

    # A topic from another course cannot be slipped in.
    other = client.post("/api/courses", json={"name": "Another Course"}, headers=admin["headers"]).json()
    foreign = client.post(f"/api/courses/{other['id']}/topics", json={"name": "Foreign"}, headers=admin["headers"]).json()
    rejected = client.put("/api/learning/selection", json={"course_id": catalog["course_id"], "topic_ids": [foreign["id"]]}, headers=headers)
    assert rejected.status_code == 400


def test_students_cannot_pick_topics_in_unpublished_courses(client, admin, student):
    hidden = client.post("/api/courses", json={"name": "Hidden Course", "is_published": False}, headers=admin["headers"]).json()
    topic = client.post(f"/api/courses/{hidden['id']}/topics", json={"name": "Secret"}, headers=admin["headers"]).json()
    response = client.put(f"/api/learning/topics/{topic['id']}/selection", json={"selected": True}, headers=student["headers"])
    assert response.status_code == 404


def test_a_test_can_cover_several_picked_topics(client, admin, student, catalog):
    extra = client.post(f"/api/courses/{catalog['course_id']}/topics", json={"name": "Extra", "skill_area": "Extras"}, headers=admin["headers"]).json()
    for number in range(3):
        client.post(
            "/api/questions",
            json={"topic_id": extra["id"], "text": f"Extra question {number + 1}?", "options": ["Right", "Wrong"], "correct_index": 0},
            headers=admin["headers"],
        )
    attempt = start_attempt(client, student, course_id=catalog["course_id"], topic_ids=[catalog["topic_a"], extra["id"]], count=20)
    assert attempt["question_count"] == 9  # 6 from Descriptive and 3 from Extra, none from Probability
    assert {q["topic"] for q in attempt["questions"]} == {"Descriptive", "Extra"}
    answer_and_submit(client, student, attempt, lambda pos: 0)

    unknown = client.post("/api/assessments", json={"course_id": catalog["course_id"], "topic_ids": [99999], "count": 3}, headers=student["headers"])
    assert unknown.status_code == 404


def test_overview_numbers_come_from_real_results(client, student, catalog):
    choose_course(client, student, catalog)
    empty = client.get("/api/learning/overview", headers=student["headers"]).json()
    assert empty["stats"]["answers"] == 0
    assert empty["stats"]["accuracy_percent"] is None
    assert empty["continue"]["type"] == "start"
    assert empty["continue"]["name"] == "Descriptive"
    assert empty["up_next"][0]["kind"] == "start"
    assert empty["activity"] == []
    assert not any(b["earned"] for b in empty["achievements"])

    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    answer_and_submit(client, student, attempt, lambda pos: 0 if pos <= 7 else 1)  # 7 of 10 correct
    data = client.get("/api/learning/overview", headers=student["headers"]).json()
    assert data["stats"]["answers"] == 10
    assert data["stats"]["correct"] == 7
    assert data["stats"]["accuracy_percent"] == 70.0
    assert data["stats"]["tests_submitted"] == 1
    assert data["stats"]["streak_days"] == 1
    assert data["activity"][0]["kind"] == "test"
    assert data["assessments"][0]["score_percent"] == 70.0
    earned = {b["id"] for b in data["achievements"] if b["earned"]}
    assert "first-steps" in earned
    assert "perfect-score" not in earned
    assert data["courses"][0]["id"] == catalog["course_id"]


def test_unfinished_tests_are_offered_first(client, student, catalog):
    choose_course(client, student, catalog)
    start_attempt(client, student, course_id=catalog["course_id"], count=3)
    data = client.get("/api/learning/overview", headers=student["headers"]).json()
    assert data["continue"]["type"] == "attempt"
    assert data["continue"]["answered"] == 0
    assert data["continue"]["total"] == 3
    assert data["up_next"][0]["kind"] == "resume"


def test_a_perfect_test_earns_its_badge(client, student, catalog):
    choose_course(client, student, catalog)
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    answer_and_submit(client, student, attempt, lambda pos: 0)  # all correct
    data = client.get("/api/learning/overview", headers=student["headers"]).json()
    earned = {b["id"] for b in data["achievements"] if b["earned"]}
    assert {"first-steps", "perfect-score", "topic-master", "course-champion"} <= earned
    assert data["progress"]["progress_percent"] == 100.0


def test_report_includes_completion_milestones_and_badges(client, student, catalog):
    choose_course(client, student, catalog)
    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    answer_and_submit(client, student, attempt, lambda pos: 0 if pos <= 5 else 1)  # 5 of 10 correct
    report = client.get("/api/progress/report", headers=student["headers"]).json()
    assert report["completion"]["total_questions"] == 10
    assert report["completion"]["mastered_questions"] == 5
    assert report["completion"]["progress_percent"] == 50.0
    assert len(report["topic_overview"]) == 2
    assert report["milestones"][0]["title"] == "First test submitted"
    assert any(m["title"] == "10 questions attempted" for m in report["milestones"])
    assert {b["id"] for b in report["achievements"]} >= {"first-steps", "on-a-roll", "bookworm"}
