"""Small helpers shared by the test files."""

STUDENT_PASSWORD = "Study1234"
ADMIN_PASSWORD = "Admin1234"


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register_student(client, email: str = "student@example.com", name: str = "Asha Student") -> dict:
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": name,
            "email": email,
            "password": STUDENT_PASSWORD,
            "confirm_password": STUDENT_PASSWORD,
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return {
        "id": body["user"]["id"],
        "email": email,
        "token": body["access_token"],
        "headers": auth(body["access_token"]),
    }
