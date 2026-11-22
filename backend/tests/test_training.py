"""Study material: upload checks, access rules, important points, completion and books."""

import io
import zipfile

from tests.helpers import register_student

PDF_BYTES = b"%PDF-1.4\n% StatSkill AI test document\n%%EOF\n"


def docx_bytes() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", "<w:document/>")
    return buffer.getvalue()


def upload(client, headers, catalog, filename, content, title="Probability notes", **fields):
    data = {
        "title": title,
        "course_id": str(catalog["course_id"]),
        "topic_id": str(catalog["topic_b"]),
        "is_published": "true",
    }
    data.update({key: str(value) for key, value in fields.items()})
    return client.post(
        "/api/resources/upload",
        data=data,
        files={"file": (filename, content, "application/octet-stream")},
        headers=headers,
    )


def test_valid_pdf_and_docx_are_stored_with_metadata(client, admin, catalog):
    pdf = upload(client, admin["headers"], catalog, "probability.pdf", PDF_BYTES)
    assert pdf.status_code == 201, pdf.text
    body = pdf.json()
    assert body["resource_type"] == "pdf"
    assert body["original_filename"] == "probability.pdf"
    assert body["size_bytes"] == len(PDF_BYTES)

    docx = upload(client, admin["headers"], catalog, "notes.docx", docx_bytes(), title="Word notes")
    assert docx.status_code == 201, docx.text
    assert docx.json()["resource_type"] == "docx"


def test_invalid_files_are_rejected(client, admin, catalog):
    assert upload(client, admin["headers"], catalog, "notes.txt", b"plain text").status_code == 415
    assert upload(client, admin["headers"], catalog, "fake.pdf", b"this is not a pdf").status_code == 415
    assert upload(client, admin["headers"], catalog, "empty.pdf", b"").status_code == 422
    too_big = b"%PDF-" + b"0" * (1024 * 1024 + 1)  # just over the 1 MB test limit
    assert upload(client, admin["headers"], catalog, "big.pdf", too_big).status_code == 413


def test_the_same_file_cannot_be_uploaded_twice(client, admin, catalog):
    assert upload(client, admin["headers"], catalog, "a.pdf", PDF_BYTES).status_code == 201
    again = upload(client, admin["headers"], catalog, "copy.pdf", PDF_BYTES, title="Copy")
    assert again.status_code == 409


def test_only_staff_can_upload(client, catalog):
    student = register_student(client)
    assert upload(client, student["headers"], catalog, "x.pdf", PDF_BYTES).status_code == 403


def test_students_see_and_download_only_published_material(client, admin, student, catalog):
    published = upload(client, admin["headers"], catalog, "public.pdf", PDF_BYTES, title="Public notes").json()
    hidden = upload(
        client,
        admin["headers"],
        catalog,
        "draft.pdf",
        PDF_BYTES + b"% draft\n",
        title="Draft notes",
        is_published="false",
    ).json()

    listed = client.get(f"/api/resources?topic_id={catalog['topic_b']}", headers=student["headers"]).json()
    assert [r["id"] for r in listed] == [published["id"]]
    assert client.get(f"/api/resources/{hidden['id']}/download", headers=student["headers"]).status_code == 404

    download = client.get(f"/api/resources/{published['id']}/download", headers=student["headers"])
    assert download.status_code == 200
    assert download.content == PDF_BYTES


def test_important_points_marks_and_completion(client, admin, student, catalog):
    client.put("/api/profile", json={"current_course_id": catalog["course_id"]}, headers=student["headers"])
    resource = upload(
        client,
        admin["headers"],
        catalog,
        "points.pdf",
        PDF_BYTES,
        important_points="KEY: P(A) is always between 0 and 1\nComplement rule: P(not A) = 1 - P(A)",
    ).json()

    page = client.get(f"/api/training/topics/{catalog['topic_b']}", headers=student["headers"]).json()
    assert len(page["points"]) == 2
    key_points = [p for p in page["points"] if p["is_key_concept"]]
    assert len(key_points) == 1
    assert key_points[0]["text"].startswith("P(A)")

    point_id = key_points[0]["id"]
    assert client.post(f"/api/training/points/{point_id}/mark", headers=student["headers"]).json()["marked"] is True
    assert client.post(f"/api/training/points/{point_id}/mark", headers=student["headers"]).json()["marked"] is False

    done = client.post(f"/api/resources/{resource['id']}/progress", json={"completed": True}, headers=student["headers"])
    assert done.status_code == 200
    report = client.get(
        f"/api/progress/report?course_id={catalog['course_id']}",
        headers=student["headers"],
    ).json()
    assert report["training"]["completed_materials"] == 1
    assert report["training"]["completion_percent"] == 100.0


def test_books_are_validated_saved_and_removed(client, admin, student, catalog):
    book = client.post(
        "/api/books",
        json={
            "title": "Practical Statistics",
            "author": "A. Author",
            "description": "Clear worked examples",
            "course_id": catalog["course_id"],
            "topic_id": catalog["topic_b"],
            "skill_tag": "Probability reasoning",
            "url": "https://example.com/books/practical-statistics",
            "is_published": True,
        },
        headers=admin["headers"],
    )
    assert book.status_code == 201, book.text
    book_id = book.json()["id"]

    bad_link = client.post(
        "/api/books",
        json={"title": "Bad Link Book", "author": "B. Author", "url": "ftp://example.com/book"},
        headers=admin["headers"],
    )
    assert bad_link.status_code == 422

    student_add = client.post(
        "/api/books",
        json={"title": "Student Book", "author": "S. Author", "url": "https://example.com/x"},
        headers=student["headers"],
    )
    assert student_add.status_code == 403

    listed = client.get(f"/api/books?topic_id={catalog['topic_b']}", headers=student["headers"]).json()
    assert [b["id"] for b in listed] == [book_id]

    assert client.post(f"/api/books/{book_id}/save", headers=student["headers"]).json()["saved"] is True
    assert [b["id"] for b in client.get("/api/books/saved", headers=student["headers"]).json()] == [book_id]

    client.delete(f"/api/books/{book_id}/save", headers=student["headers"])
    assert client.get("/api/books/saved", headers=student["headers"]).json() == []
