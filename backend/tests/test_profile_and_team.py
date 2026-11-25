"""Profile options and fields, the seeded team, and the startup migration for older databases."""

from app.db.database import database
from app.db.models import Creator
from app.db.setup import ensure_columns

TEAM_ORDER = ["G Kaushik", "Jhon Fanny"]


def test_profile_options_and_new_fields_are_saved(client, student, catalog):
    options = client.get("/api/profile/options", headers=student["headers"]).json()
    assert len(options["avatars"]) == 13
    assert len(options["themes"]) == 8
    assert {"short-quizzes", "mornings"} <= {p["id"] for p in options["preferences"]}

    empty = client.get("/api/profile", headers=student["headers"]).json()
    assert empty["avatar"] is None
    assert empty["learning_preferences"] == []
    assert empty["completion"]["percent"] == 11  # only the name is filled: 1 of 9

    saved = client.put(
        "/api/profile",
        json={
            "avatar": "robot",
            "theme": "mint",
            "learning_preferences": ["short-quizzes", "mornings", "short-quizzes"],
            "interests": ["Statistics", "Probability"],
        },
        headers=student["headers"],
    )
    assert saved.status_code == 200, saved.text
    again = client.get("/api/profile", headers=student["headers"]).json()
    assert again["avatar"] == "robot"
    assert again["theme"] == "mint"
    assert again["learning_preferences"] == ["short-quizzes", "mornings"]  # duplicates dropped
    assert again["completion"]["percent"] == 56  # name, avatar, theme, interests, preferences: 5 of 9
    assert "college" in again["completion"]["missing"]


def test_profile_rejects_choices_that_are_not_offered(client, student):
    assert client.put("/api/profile", json={"avatar": "dragon"}, headers=student["headers"]).status_code == 422
    assert client.put("/api/profile", json={"theme": "neon"}, headers=student["headers"]).status_code == 422
    assert client.put("/api/profile", json={"learning_preferences": ["sleeping"]}, headers=student["headers"]).status_code == 422


def test_team_is_seeded_in_the_requested_order(client, admin):
    team = client.get("/api/creators").json()
    assert [member["name"] for member in team] == TEAM_ORDER
    assert team[0]["role_title"] == "UI"
    options = client.get("/api/profile/options", headers=admin["headers"]).json()
    avatar_ids = {a["id"] for a in options["avatars"]}
    for member in team:
        assert member["title"]
        assert member["avatar"] in avatar_ids
        assert member["theme_color"].startswith("#") and len(member["theme_color"]) == 7
        assert member["is_placeholder"] is True
    assert len({member["theme_color"] for member in team}) == 2  # every character has its own colour


def test_admins_can_edit_character_details_with_validation(client, admin):
    first = client.get("/api/creators").json()[0]
    updated = client.put(
        f"/api/creators/{first['id']}",
        json={"title": "The Pixel Pusher", "theme_color": "#112233", "avatar": "robot", "nickname": "K"},
        headers=admin["headers"],
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "The Pixel Pusher"
    assert updated.json()["theme_color"] == "#112233"
    assert updated.json()["is_placeholder"] is False
    assert client.put(f"/api/creators/{first['id']}", json={"theme_color": "red"}, headers=admin["headers"]).status_code == 422
    assert client.put(f"/api/creators/{first['id']}", json={"avatar": "dragon"}, headers=admin["headers"]).status_code == 422


def test_old_untouched_placeholders_are_replaced_by_the_team(client):
    for number in range(1, 4):
        Creator.create(name=f"Creator {number}", role_title="Role to be added", description="old", position=number, is_placeholder=True)
    team = client.get("/api/creators").json()
    assert [member["name"] for member in team] == TEAM_ORDER


def test_edited_creators_are_never_overwritten(client, admin):
    first = client.get("/api/creators").json()[0]
    client.put(f"/api/creators/{first['id']}", json={"name": "Edited Name"}, headers=admin["headers"])
    team = client.get("/api/creators").json()
    assert len(team) == 2
    assert team[0]["name"] == "Edited Name"


def test_missing_columns_are_added_to_an_older_database(client):
    database.execute_sql("DROP TABLE creator")
    database.execute_sql(
        "CREATE TABLE creator (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, "
        "name VARCHAR(120) NOT NULL, role_title VARCHAR(120) NOT NULL, description TEXT NOT NULL, photo_path VARCHAR(255), "
        "photo_mime VARCHAR(50), position INTEGER NOT NULL, is_placeholder INTEGER NOT NULL)"
    )
    added = ensure_columns()
    assert set(added) == {"creator.nickname", "creator.title", "creator.intro", "creator.theme_color", "creator.avatar"}
    assert ensure_columns() == []  # running it again changes nothing



def test_other_members_are_removed_from_an_older_database(client):
    client.get("/api/creators")  # seeds the two project members
    for number, name in enumerate(["Anna", "Jonas", "Jude"], start=3):
        Creator.create(name=name, role_title="Team member", description="old", position=number, is_placeholder=True)
    Creator.create(name="Mentor Meena", role_title="Mentor", description="added by hand", position=9, is_placeholder=False)
    names = [member["name"] for member in client.get("/api/creators").json()]
    assert names == ["G Kaushik", "Jhon Fanny", "Mentor Meena"]  # untouched placeholders go; people added by hand stay