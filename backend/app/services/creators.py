"""The About page's team. The first ten members are seeded; every field stays editable by an administrator.

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
    {
        "name": "Anna",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Problem Solver",
        "theme_color": "#4FC3F7",
        "avatar": "artist",
        "description": "Calm under pressure, and quick to find the one loose thread that makes a problem fall apart.",
        "intro": "Anna untangles the tricky parts so the rest of the team can keep moving.",
    },
    {
        "name": "Jonas",
        "nickname": "Jons",
        "role_title": "Team member",
        "title": "The Tech Explorer",
        "theme_color": "#A99BFF",
        "avatar": "dj",
        "description": "Curious about every new tool, and the first to ask what happens if we press this.",
        "intro": "Jonas, also known as Jons, explores new tools and ideas for the team.",
    },
    {
        "name": "Ashwin",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Creative Mind",
        "theme_color": "#FF8A65",
        "avatar": "captain",
        "description": "Sees a blank page as an invitation, not a problem.",
        "intro": "Ashwin brings fresh angles to how Study Buddy looks and works.",
    },
    {
        "name": "Neha",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Design Enthusiast",
        "theme_color": "#FF7EB6",
        "avatar": "wizard",
        "description": "Notices colour, rhythm and balance everywhere, even on a bus ticket.",
        "intro": "Neha cares about every detail of the design.",
    },
    {
        "name": "Karthikayan",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Innovation Expert",
        "theme_color": "#2EC4B6",
        "avatar": "cool",
        "description": "Loves turning a what-if into a working prototype before anyone can argue.",
        "intro": "Karthikayan pushes Study Buddy towards new and better ideas.",
    },
    {
        "name": "Princy",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Data Detective",
        "theme_color": "#FFD60A",
        "avatar": "sunny",
        "description": "Follows the numbers until the story behind them shows up.",
        "intro": "Princy keeps the data honest and the questions sharp.",
    },
    {
        "name": "Cris",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Quiet Strategist",
        "theme_color": "#3A45B5",
        "avatar": "champ",
        "description": "Says little, plans carefully, and the plan usually works.",
        "intro": "Cris thinks a few moves ahead for the team.",
    },
    {
        "name": "Jude",
        "nickname": None,
        "role_title": "Team member",
        "title": "The Team Spark",
        "theme_color": "#5ED38A",
        "avatar": "ninja",
        "description": "Brings the energy that keeps the whole group going.",
        "intro": "Jude lifts the mood and keeps the team moving.",
    },
)

_OLD_PLACEHOLDERS = {"Creator 1", "Creator 2", "Creator 3"}


# Untouched seeded rows that were created with an earlier spelling are renamed once.
_RENAMES = {
    "Kaushik": ("G Kaushik", "Kaushik shapes how", "G Kaushik shapes how"),
    "Kaushik Karthikayan": ("G Kaushik", "Kaushik Karthikayan shapes how", "G Kaushik shapes how"),
    "Alfin": ("Jhon Fanny", "Alfin keeps the", "Jhon Fanny keeps the"),
}


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


