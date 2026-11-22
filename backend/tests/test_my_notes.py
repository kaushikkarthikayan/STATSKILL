"""My notes are private to the student who uploaded them."""

PDF = b"%PDF-1.4\n% my notes\n%%EOF\n"


def upload(client, who, name="notes.pdf", content=PDF, title="Week 1 notes", **extra):
    return client.post("/api/my-notes/upload", data={"title": title, **extra}, files={"file": (name, content, "application/pdf")}, headers=who["headers"])


def test_upload_list_open_and_delete(client, student, catalog):
    made = upload(client, student, course_id=str(catalog["course_id"]), topic_id=str(catalog["topic_a"]))
    assert made.status_code == 201, made.text
    note = made.json()
    assert note["kind"] == "pdf" and note["topic"] == "Descriptive"
    assert [n["id"] for n in client.get(f"/api/my-notes?topic_id={catalog['topic_a']}", headers=student["headers"]).json()] == [note["id"]]
    opened = client.get(f"/api/my-notes/{note['id']}/download", headers=student["headers"])
    assert opened.status_code == 200 and opened.content == PDF
    assert client.delete(f"/api/my-notes/{note['id']}", headers=student["headers"]).status_code == 200
    assert client.get("/api/my-notes", headers=student["headers"]).json() == []


def test_text_notes_and_validation(client, student):
    ok = client.post("/api/my-notes/text", json={"title": "Formulas", "text": "d/dx x^n = n x^(n-1)"}, headers=student["headers"])
    assert ok.status_code == 201 and ok.json()["text"].startswith("d/dx")
    assert upload(client, student, name="evil.exe", content=b"MZ").status_code == 415
    assert upload(client, student, name="fake.pdf", content=b"not a pdf").status_code == 415
    assert upload(client, student, title="a").status_code == 422
    assert upload(client, student).status_code == 201
    assert upload(client, student, title="Same file again").status_code == 409


def test_notes_are_private(client, student, admin):
    note = upload(client, student).json()
    assert client.get(f"/api/my-notes/{note['id']}/download", headers=admin["headers"]).status_code == 404
    assert client.delete(f"/api/my-notes/{note['id']}", headers=admin["headers"]).status_code == 404
    assert client.get("/api/my-notes", headers=admin["headers"]).json() == []
    assert client.get("/api/my-notes").status_code in (401, 403)