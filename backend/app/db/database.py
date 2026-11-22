"""Database connection and the shared base model.

Local development uses SQLite (a single file, no install). Set DB_ENGINE=postgres to use PostgreSQL.
Peewee keeps one connection per worker thread and reuses it, so routes do not open and close
connections on every request.
"""

from datetime import datetime, timezone

from peewee import DateTimeField, Model, PostgresqlDatabase, SqliteDatabase

from app.core.config import settings


def utcnow() -> datetime:
    """Naive UTC timestamp. Both SQLite and PostgreSQL store it the same way."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def build_database():
    if settings.DB_ENGINE == "postgres":
        return PostgresqlDatabase(
            settings.DATABASE_NAME,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD,
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            autorollback=True,
        )
    path = settings.sqlite_file
    path.parent.mkdir(parents=True, exist_ok=True)
    return SqliteDatabase(
        str(path),
        pragmas={"foreign_keys": 1, "journal_mode": "wal"},
        timeout=10,
    )


database = build_database()


class BaseModel(Model):
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)

    class Meta:
        database = database

    def save(self, *args, **kwargs):
        self.updated_at = utcnow()
        return super().save(*args, **kwargs)
