"""The About page's team. The project team (two members) is seeded; every field stays editable by an administrator.

Names and the UI role come from the team. The character titles and descriptions are playful placeholders,
not verified facts, so they are marked as placeholders until an administrator edits them.
"""

from app.db.database import database
from app.db.models import Creator

TEAM = (
    {
        "name": "G Kaushik",
        "nickname": None,
        "role_title": "UI",
        "title": "The UI Architect",
        "theme_color": "#BDF700",
        "avatar": "scholar",
        "description": "Turns rough ideas into screens that feel good to tap, and sweats the spacing, colour and tiny details.",
        "intro": "G Kaushik shapes how Study Buddy looks and feels, from the first animation to the last button.",
    },
    {
        "name": "Jhon Fanny",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Idea Machine",
        "theme_color": "#FF9F43",
        "avatar": "sprinter",
        "description": "Always three ideas ahead, and happy to try the strange one first.",
        "intro": "Jhon Fanny keeps the brainstorms lively and the list of possibilities long.",
    },

)

_OLD_PLACEHOLDERS = {"Creator 1", "Creator 2", "Creator 3"}


# Untouched seeded rows that were created with an earlier spelling are renamed once.
_RENAMES = {
    "Kaushik": ("G Kaushik", "Kaushik shapes how", "G Kaushik shapes how"),
    "Kaushik Karthikayan": ("G Kaushik", "Kaushik Karthikayan shapes how", "G Kaushik shapes how"),
    "Alfin": ("Jhon Fanny", "Alfin keeps the", "Jhon Fanny keeps the"),
}


# Earlier versions seeded ten people. Only the two project members remain; untouched placeholder rows of the others are removed.
_REMOVED = {"Anna", "Jonas", "Ashwin", "Neha", "Karthikayan", "Princy", "Cris", "Jude"}


def _prune_removed() -> None:
    Creator.delete().where((Creator.is_placeholder == True) & (Creator.name.in_(list(_REMOVED)))).execute()  # noqa: E712


def _apply_renames() -> None:
    for row in Creator.select().where(Creator.is_placeholder == True):  # noqa: E712
        rule = _RENAMES.get(row.name)
        if rule:
            row.name = rule[0]
            row.intro = (row.intro or "").replace(rule[1], rule[2])
            row.save()
        # The site is called Study Buddy; untouched placeholder text still using the old name is corrected.
        if "StatSkill AI" in (row.intro or ""):
            row.intro = row.intro.replace("StatSkill AI", "Study Buddy")
            row.save()


def ensure_team_creators() -> None:
    """Seeds the team on first use, and replaces the three old untouched placeholders. Edited rows are left alone."""
    _apply_renames()
    _prune_removed()
    existing = list(Creator.select())
    if existing and not all(c.is_placeholder and c.name in _OLD_PLACEHOLDERS for c in existing):
        return
    with database.atomic():
        current = list(Creator.select())
        if current and not all(c.is_placeholder and c.name in _OLD_PLACEHOLDERS for c in current):
            return
        if current:
            Creator.delete().where(Creator.id.in_([c.id for c in current])).execute()
        for position, member in enumerate(TEAM, start=1):
            Creator.create(position=position, is_placeholder=True, **member)


