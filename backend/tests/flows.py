"""Helpers that walk through a test session. Several test files use them."""


def start_attempt(client, student: dict, **body) -> dict:
    payload = {"mode": "assessment", "count": 10, **body}
    response = client.post("/api/assessments", json=payload, headers=student["headers"])
    assert response.status_code == 201, response.text
    return response.json()


def answer_and_submit(client, student: dict, attempt: dict, choose) -> dict:
    """choose(position) returns the option to select, or None to leave that question unanswered."""
    attempt_id = attempt["attempt_id"]
    for question in attempt["questions"]:
        index = choose(question["position"])
        if index is not None:
            response = client.put(
                f"/api/assessments/{attempt_id}/answers/{question['position']}",
                json={"selected_index": index},
                headers=student["headers"],
            )
            assert response.status_code == 200, response.text
    response = client.post(f"/api/assessments/{attempt_id}/submit", headers=student["headers"])
    assert response.status_code == 200, response.text
    return response.json()
