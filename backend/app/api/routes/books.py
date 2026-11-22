"""Book recommendations: creators and administrators add books; students browse and save them."""

from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CreatorUser, CurrentUser, is_staff
from app.db.models import Book, Course, SavedBook, Topic, User
from app.schemas import BookIn, BookUpdate
from app.services.common import ensure_profile, get_or_404
from app.services.progress import topic_stats

router = APIRouter(prefix="/books", tags=["Book recommendations"])


def _book_out(book: Book) -> dict:
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "description": book.description,
        "course_id": book.course_id,
        "topic_id": book.topic_id,
        "topic": book.topic.name if book.topic_id else None,
        "skill_tag": book.skill_tag,
        "url": book.url,
        "is_published": book.is_published,
        "added_by_id": book.added_by_id,
    }


def _check_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(422, "The book link must start with http:// or https://")
    if len(url) > 500:
        raise HTTPException(422, "The book link is too long (500 characters at most).")
    return url


def _check_scope(course_id: int | None, topic_id: int | None) -> None:
    if course_id is not None:
        get_or_404(Course, course_id, "Course not found.")
    if topic_id is not None:
        topic = get_or_404(Topic, topic_id, "Topic not found.")
        if course_id is not None and topic.course_id != course_id:
            raise HTTPException(400, "That topic belongs to a different course.")


def _require_owner_or_admin(book: Book, user: User) -> None:
    if user.role == "admin" or book.added_by_id == user.id:
        return
    raise HTTPException(403, "Only the person who added this book or an administrator can change it.")


@router.get("")
def list_books(
    user: CurrentUser,
    course_id: int | None = Query(default=None, gt=0),
    topic_id: int | None = Query(default=None, gt=0),
    q: str | None = Query(default=None, max_length=200),
    recommended: bool = False,
):
    query = Book.select()
    if course_id is not None:
        query = query.where(Book.course == course_id)
    if topic_id is not None:
        query = query.where(Book.topic == topic_id)
    if q:
        query = query.where(Book.title.contains(q) | Book.author.contains(q))
    if not is_staff(user):
        query = query.where(Book.is_published == True)  # noqa: E712

    saved = {s.book_id for s in SavedBook.select().where(SavedBook.user == user)}
    weak_topics: set[int] = set()
    if recommended:
        profile = ensure_profile(user)
        if profile.current_course_id:
            weak_topics = {
                s["topic_id"]
                for s in topic_stats(user.id, profile.current_course_id)
                if s["status"] in ("weak", "developing")
            }

    items = [
        {**_book_out(b), "saved": b.id in saved, "matches_weak_area": b.topic_id in weak_topics}
        for b in query.order_by(Book.title)
    ]
    if recommended:
        # Books for the student's weak topics come first. Only topics with real results count.
        items.sort(key=lambda item: (not item["matches_weak_area"], item["title"]))
    return items


@router.get("/saved")
def saved_books(user: CurrentUser):
    rows = (
        SavedBook.select(SavedBook, Book)
        .join(Book, on=(SavedBook.book == Book.id))
        .where(SavedBook.user == user)
        .order_by(SavedBook.created_at.desc())
    )
    return [{**_book_out(row.book), "saved_at": row.created_at} for row in rows]


@router.post("", status_code=201)
def add_book(payload: BookIn, user: CreatorUser):
    _check_scope(payload.course_id, payload.topic_id)
    topic = get_or_404(Topic, payload.topic_id, "Topic not found.") if payload.topic_id else None
    book = Book.create(
        title=payload.title,
        author=payload.author,
        description=payload.description,
        course_id=payload.course_id,
        topic=topic,
        skill_tag=payload.skill_tag,
        url=_check_url(str(payload.url)),
        is_published=payload.is_published,
        added_by=user.id,
    )
    return _book_out(book)


@router.put("/{book_id}")
def update_book(book_id: int, payload: BookUpdate, user: CreatorUser):
    book = get_or_404(Book, book_id, "Book not found.")
    _require_owner_or_admin(book, user)
    changes = payload.model_dump(exclude_unset=True)
    _check_scope(changes.get("course_id"), changes.get("topic_id"))
    if changes.get("topic_id") is not None:
        book.topic = get_or_404(Topic, changes["topic_id"], "Topic not found.")
    if changes.get("url") is not None:
        book.url = _check_url(str(changes["url"]))
    for field in ("title", "author", "description", "course_id", "skill_tag", "is_published"):
        if changes.get(field) is not None:
            setattr(book, field, changes[field])
    book.save()
    return _book_out(book)


@router.delete("/{book_id}")
def delete_book(book_id: int, user: CreatorUser):
    book = get_or_404(Book, book_id, "Book not found.")
    _require_owner_or_admin(book, user)
    book.delete_instance()
    return {"message": "Book deleted."}


@router.post("/{book_id}/save")
def save_book(book_id: int, user: CurrentUser):
    book = get_or_404(Book, book_id, "Book not found.")
    if not book.is_published and not is_staff(user):
        raise HTTPException(404, "Book not found.")
    SavedBook.get_or_create(user=user, book=book)
    return {"book_id": book.id, "saved": True}


@router.delete("/{book_id}/save")
def unsave_book(book_id: int, user: CurrentUser):
    SavedBook.delete().where((SavedBook.user == user) & (SavedBook.book == book_id)).execute()
    return {"book_id": book_id, "saved": False}
