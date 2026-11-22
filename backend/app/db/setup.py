"""Creates the tables, and adds columns introduced after a database was first created.

A fresh database gets every column from create_tables. An older database file keeps working:
the missing columns are added here, nullable so existing rows stay valid.
"""

from peewee import CharField, TextField
from playhouse.migrate import PostgresqlMigrator, SqliteMigrator, migrate

from app.core.config import settings
from app.db.database import database
from app.db.models import ALL_MODELS


def _new_columns():
    # (table, column, field). Built fresh on every call because the migrator renames the field it is given.
    return [
        ("studentprofile", "avatar", CharField(max_length=30, null=True)),
        ("studentprofile", "theme", CharField(max_length=30, null=True)),
        ("studentprofile", "learning_preferences", TextField(null=True)),
        ("creator", "nickname", CharField(max_length=40, null=True)),
        ("creator", "title", CharField(max_length=80, null=True)),
        ("creator", "intro", TextField(null=True)),
        ("creator", "theme_color", CharField(max_length=7, null=True)),
        ("creator", "avatar", CharField(max_length=30, null=True)),
    ]


def ensure_columns() -> list[str]:
    """Adds any missing columns and returns their names, for example ['creator.title']."""
    migrator = PostgresqlMigrator(database) if settings.DB_ENGINE == "postgres" else SqliteMigrator(database)
    known: dict[str, set[str]] = {}
    added = []
    for table, column, field in _new_columns():
        if table not in known:
            known[table] = {c.name for c in database.get_columns(table)}
        if column not in known[table]:
            migrate(migrator.add_column(table, column, field))
            added.append(f"{table}.{column}")
    return added


def init_database() -> list[str]:
    database.create_tables(ALL_MODELS, safe=True)
    return ensure_columns()
