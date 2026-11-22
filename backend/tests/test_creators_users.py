"""The About page creators and the administrator's user management."""

from tests.helpers import STUDENT_PASSWORD

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def test_placeholders_are_listed_and_only_admins_can_edit(client, admin, student):
    listed = client.get("/api/creators").json()  # public: the About page works before login
    assert len(listed) == 10
    assert all(c["is_placeholder"] for c in listed)

    creator_id = listed[0]["id"]
    forbidden = client.put(f"/api/creators/{creator_id}", json={"name": "Real Name"}, headers=student["headers"])
    assert forbidden.status_code == 403

    updated = client.put(
        f"/api/creators/{creator_id}",
        json={"name": "Real Name", "description": "Builds the backend"},
        headers=admin["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Real Name"
    assert updated.json()["is_placeholder"] is False


def test_creator_photo_is_checked_and_served(client, admin):
    creator_id = client.get("/api/creators").json()[0]["id"]
    url = f"/api/creators/{creator_id}/photo"

    wrong_type = client.post(url, files={"file": ("x.gif", b"GIF89a....", "image/gif")}, headers=admin["headers"])
    assert wrong_type.status_code == 415
    fake_png = client.post(url, files={"file": ("x.png", b"not really a png", "image/png")}, headers=admin["headers"])
    assert fake_png.status_code == 415

    accepted = client.post(url, files={"file": ("me.png", PNG_BYTES, "image/png")}, headers=admin["headers"])
    assert accepted.status_code == 200
    assert accepted.json()["has_photo"] is True

    served = client.get(url)
    assert served.status_code == 200
    assert served.content == PNG_BYTES


def test_admin_can_promote_a_student_to_content_creator(client, admin, student, catalog):
    users = client.get("/api/users", headers=admin["headers"]).json()
    target = next(u for u in users["items"] if u["email"] == student["email"])
    changed = client.put(f"/api/users/{target['id']}", json={"role": "content_creator"}, headers=admin["headers"])
    assert changed.status_code == 200

    # Their old session ended, so they log in again and can then add questions.
    assert client.get("/api/auth/me", headers=student["headers"]).status_code == 401
    login = client.post("/api/auth/login", json={"email": student["email"], "password": STUDENT_PASSWORD}).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    created = client.post(
        "/api/questions",
        json={"topic_id": catalog["topic_a"], "text": "Added by a content creator?", "options": ["Yes", "No"], "correct_index": 0},
        headers=headers,
    )
    assert created.status_code == 201


def test_students_cannot_list_users_and_admins_cannot_demote_themselves(client, admin, student):
    assert client.get("/api/users", headers=student["headers"]).status_code == 403
    me = client.get("/api/auth/me", headers=admin["headers"]).json()
    demote = client.put(f"/api/users/{me['id']}", json={"role": "student"}, headers=admin["headers"])
    assert demote.status_code == 400
