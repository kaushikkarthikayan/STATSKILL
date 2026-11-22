"""Progress report, weak-area detection and recommendations, built only from real answers."""

from tests.flows import answer_and_submit, start_attempt


def test_report_invents_nothing_before_any_test(client, student, catalog):
    client.put("/api/profile", json={"current_course_id": catalog["course_id"]}, headers=student["headers"])
    body = client.get("/api/progress/report", headers=student["headers"]).json()
    assert body["overall"]["accuracy_percent"] is None
    assert body["overall"]["tests_submitted"] == 0
    assert body["missing_skills"] == []
    assert body["strong_areas"] == []
    assert body["recommendations"] == []
    assert all(t["status"] == "not_assessed" for t in body["topics"])


def test_report_flags_a_missing_skill_and_recommends_material(client, admin, student, catalog):
    client.put("/api/profile", json={"current_course_id": catalog["course_id"]}, headers=student["headers"])
    material = client.post(
        "/api/resources",
        json={
            "title": "Probability notes",
            "resource_type": "link",
            "course_id": catalog["course_id"],
            "topic_id": catalog["topic_b"],
            "external_url": "https://example.com/probability",
            "is_published": True,
        },
        headers=admin["headers"],
    )
    assert material.status_code == 201, material.text

    attempt = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    topic_of = {q["position"]: q["topic"] for q in attempt["questions"]}
    # Every Descriptive answer is right, every Probability answer is wrong.
    answer_and_submit(client, student, attempt, lambda pos: 0 if topic_of[pos] == "Descriptive" else 1)

    body = client.get("/api/progress/report", headers=student["headers"]).json()
    topics = {t["topic"]: t for t in body["topics"]}
    assert topics["Descriptive"]["status"] == "strong"
    assert topics["Probability"]["status"] == "weak"
    assert [t["topic"] for t in body["missing_skills"]] == ["Probability"]
    assert body["overall"]["latest_assessment_score"] == 60.0

    kinds = {r["kind"] for r in body["recommendations"]}
    assert {"missing_skill", "revision", "study_material"} <= kinds
    study = next(r for r in body["recommendations"] if r["kind"] == "study_material")
    assert "Probability notes" in study["message"]
    assert study["evidence"]["accuracy_percent"] == 0.0


def test_improvement_over_time_is_measured(client, student, catalog):
    first = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    answer_and_submit(client, student, first, lambda pos: 1)  # 0 percent

    second = start_attempt(client, student, course_id=catalog["course_id"], count=10)
    answer_and_submit(client, student, second, lambda pos: 0)  # 100 percent

    body = client.get(
        f"/api/progress/report?course_id={catalog['course_id']}",
        headers=student["headers"],
    ).json()
    assert [h["score_percent"] for h in body["assessment_history"]] == [0.0, 100.0]
    assert body["improvement"]["change_percent_points"] == 100.0
