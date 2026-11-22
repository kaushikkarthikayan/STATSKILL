"""Authentication: sign-up rules, login, logout, password reset and protected routes."""

from datetime import timedelta

from app.core.security import new_reset_token
from app.db.database import utcnow
from app.db.models import User
from tests.helpers import STUDENT_PASSWORD, auth, register_student


def test_register_me_and_logout_end_the_session(client):
    student = register_student(client)
    me = client.get("/api/auth/me", headers=student["headers"])
    assert me.status_code == 200
    assert me.json()["role"] == "student"

    login = client.post("/api/auth/login", json={"email": student["email"], "password": STUDENT_PASSWORD})
    assert login.status_code == 200
    second_token = login.json()["access_token"]

    assert client.post("/api/auth/logout", headers=auth(second_token)).status_code == 200
    assert client.get("/api/auth/me", headers=auth(second_token)).status_code == 401
    # Logging out ends every session, including the one created at registration.
    assert client.get("/api/auth/me", headers=student["headers"]).status_code == 401


def test_duplicate_and_invalid_sign_ups_are_rejected(client):
    register_student(client)
    duplicate = client.post(
        "/api/auth/register",
        json={
            "full_name": "Someone Else",
            "email": "student@example.com",
            "password": STUDENT_PASSWORD,
            "confirm_password": STUDENT_PASSWORD,
        },
    )
    assert duplicate.status_code == 409

    weak = client.post(
        "/api/auth/register",
        json={"full_name": "Weak Password", "email": "weak@example.com", "password": "onlyletters", "confirm_password": "onlyletters"},
    )
    assert weak.status_code == 422

    mismatch = client.post(
        "/api/auth/register",
        json={"full_name": "Mismatch", "email": "mismatch@example.com", "password": STUDENT_PASSWORD, "confirm_password": "Study9999"},
    )
    assert mismatch.status_code == 422

    bad_email = client.post(
        "/api/auth/register",
        json={"full_name": "Bad Email", "email": "not-an-email", "password": STUDENT_PASSWORD, "confirm_password": STUDENT_PASSWORD},
    )
    assert bad_email.status_code == 422


def test_wrong_password_and_missing_or_fake_token(client):
    register_student(client)
    wrong = client.post("/api/auth/login", json={"email": "student@example.com", "password": "Wrong1234"})
    assert wrong.status_code == 401
    assert client.get("/api/profile").status_code == 401
    assert client.get("/api/progress/report", headers=auth("not-a-real-token")).status_code == 401


def test_remember_me_gives_a_longer_session(client):
    register_student(client)
    short = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STUDENT_PASSWORD, "remember_me": False},
    ).json()
    long = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STUDENT_PASSWORD, "remember_me": True},
    ).json()
    assert long["expires_in"] > short["expires_in"]


def test_password_reset_works_once(client):
    register_student(client)
    requested = client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    unknown = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    # The same answer is given whether or not the account exists.
    assert requested.status_code == 200
    assert requested.json() == unknown.json()

    # The real link is printed in the terminal, so the test stores a known token the way the app does.
    raw_token, token_hash = new_reset_token()
    user = User.get(User.email == "student@example.com")
    user.reset_token_hash = token_hash
    user.reset_token_expires_at = utcnow() + timedelta(minutes=10)
    user.save()

    reset = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "password": "NewPass123", "confirm_password": "NewPass123"},
    )
    assert reset.status_code == 200
    assert client.post("/api/auth/login", json={"email": "student@example.com", "password": "NewPass123"}).status_code == 200

    reused = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "password": "Another123", "confirm_password": "Another123"},
    )
    assert reused.status_code == 400


def test_expired_reset_link_is_rejected(client):
    register_student(client)
    raw_token, token_hash = new_reset_token()
    user = User.get(User.email == "student@example.com")
    user.reset_token_hash = token_hash
    user.reset_token_expires_at = utcnow() - timedelta(minutes=1)
    user.save()
    response = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "password": "NewPass123", "confirm_password": "NewPass123"},
    )
    assert response.status_code == 400
