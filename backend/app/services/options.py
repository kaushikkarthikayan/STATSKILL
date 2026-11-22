"""Choices offered in the profile builder. The website draws the pictures; only the ids are stored."""

AVATARS = (
    ("scholar", "Scholar"),
    ("captain", "Captain"),
    ("sprinter", "Sprinter"),
    ("artist", "Artist"),
    ("dj", "DJ"),
    ("cool", "Cool"),
    ("wizard", "Wizard"),
    ("sunny", "Sunny"),
    ("champ", "Champ"),
    ("ninja", "Ninja"),
    ("robot", "Robot"),
    ("sprout", "Sprout"),
    ("kitty", "Kitty"),
)

THEMES = (
    ("lime", "Lime", "#BDF700"),
    ("sunshine", "Sunshine", "#FFD60A"),
    ("tangerine", "Tangerine", "#FF9F43"),
    ("sky", "Sky", "#4FC3F7"),
    ("grape", "Grape", "#A99BFF"),
    ("bubblegum", "Bubblegum", "#FF7EB6"),
    ("mint", "Mint", "#5ED38A"),
    ("ocean", "Ocean", "#3A45B5"),
)

PREFERENCES = (
    ("short-quizzes", "Short quizzes", "format"),
    ("practice-tests", "Practice tests", "format"),
    ("deep-reading", "Deep reading", "format"),
    ("visual-notes", "Visual notes", "format"),
    ("books", "Books and articles", "format"),
    ("revision-sprints", "Revision sprints", "format"),
    ("mornings", "Mornings", "time"),
    ("afternoons", "Afternoons", "time"),
    ("evenings", "Evenings", "time"),
    ("weekends", "Weekends", "time"),
)

# Suggestions only: students can also type their own interests.
INTERESTS = (
    "Statistics",
    "Probability",
    "Data analysis",
    "Machine learning",
    "Research methods",
    "Coding",
    "Finance",
    "Health data",
    "Sports analytics",
    "Games",
)

AVATAR_IDS = {item[0] for item in AVATARS}
THEME_IDS = {item[0] for item in THEMES}
PREFERENCE_IDS = {item[0] for item in PREFERENCES}


def as_options() -> dict:
    return {
        "avatars": [{"id": i, "label": label} for i, label in AVATARS],
        "themes": [{"id": i, "label": label, "color": color} for i, label, color in THEMES],
        "preferences": [{"id": i, "label": label, "group": group} for i, label, group in PREFERENCES],
        "interests": list(INTERESTS),
    }
