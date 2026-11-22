"""All database tables.

Relationships are real foreign keys. Lists and objects (answer options, interests, objectives)
are stored as JSON text so the same schema works on SQLite and PostgreSQL.
"""

import json

from peewee import (
    BooleanField,
    CharField,
    DateTimeField,
    FloatField,
    ForeignKeyField,
    IntegerField,
    TextField,
)

from app.db.database import BaseModel, utcnow

ROLES = ("student", "content_creator", "admin")
DIFFICULTIES = ("easy", "medium", "hard")
RESOURCE_TYPES = ("pdf", "docx", "link", "note")
ATTEMPT_KINDS = ("assessment", "practice", "revision")


class JSONField(TextField):
    """A Python list or dict stored as JSON text."""

    def db_value(self, value):
        return None if value is None else json.dumps(value)

    def python_value(self, value):
        return None if value is None else json.loads(value)


class User(BaseModel):
    email = CharField(max_length=255, unique=True)
    full_name = CharField(max_length=120)
    password_hash = CharField(max_length=255)
    role = CharField(max_length=20, default="student", index=True)
    is_active = BooleanField(default=True)
    # Raised on logout and on password change, so older tokens stop working.
    token_version = IntegerField(default=0)
    reset_token_hash = CharField(max_length=64, null=True)
    reset_token_expires_at = DateTimeField(null=True)
    last_login_at = DateTimeField(null=True)


class Course(BaseModel):
    name = CharField(max_length=120, unique=True)
    slug = CharField(max_length=140, unique=True)
    description = TextField(default="")
    level = CharField(max_length=20, default="beginner")
    duration_weeks = IntegerField(default=8)
    required_skills = JSONField(default=list)
    training_parameters = JSONField(default=dict)
    is_published = BooleanField(default=True)
    created_by = ForeignKeyField(User, null=True, on_delete="SET NULL", backref="courses_created")


class StudentProfile(BaseModel):
    # One profile per user: a unique foreign key.
    user = ForeignKeyField(User, unique=True, on_delete="CASCADE", backref="profile")
    college = CharField(max_length=160, null=True)
    graduation_year = IntegerField(null=True)
    current_course = ForeignKeyField(Course, null=True, on_delete="SET NULL", backref="preparing_students")
    interests = JSONField(default=list)
    bio = TextField(null=True)
    avatar = CharField(max_length=30, null=True)
    theme = CharField(max_length=30, null=True)
    learning_preferences = JSONField(default=list)


class Topic(BaseModel):
    course = ForeignKeyField(Course, on_delete="CASCADE", backref="topics")
    name = CharField(max_length=120)
    slug = CharField(max_length=140)
    skill_area = CharField(max_length=80, default="General")
    description = TextField(default="")
    learning_objectives = JSONField(default=list)

    class Meta:
        indexes = ((("course", "slug"), True), (("course", "name"), True))


class Question(BaseModel):
    # Public unique question ID, for example Q-1A2B3C4D5E or STAT-S001.
    code = CharField(max_length=24, unique=True)
    topic = ForeignKeyField(Topic, on_delete="CASCADE", backref="questions")
    skill = CharField(max_length=80, default="General")
    difficulty = CharField(max_length=10, default="medium", index=True)
    text = TextField()
    options = JSONField(default=list)
    correct_index = IntegerField()
    explanation = TextField(default="")
    is_sample = BooleanField(default=False)
    is_active = BooleanField(default=True, index=True)
    created_by = ForeignKeyField(User, null=True, on_delete="SET NULL", backref="questions_created")


class Attempt(BaseModel):
    """One test session: a full assessment, a practice set, or a revision set."""

    user = ForeignKeyField(User, on_delete="CASCADE", backref="attempts")
    course = ForeignKeyField(Course, on_delete="CASCADE", backref="attempts")
    topic = ForeignKeyField(Topic, null=True, on_delete="SET NULL", backref="attempts")
    kind = CharField(max_length=20, default="assessment")
    difficulty = CharField(max_length=10, null=True)
    status = CharField(max_length=12, default="in_progress", index=True)
    requested_count = IntegerField()
    question_count = IntegerField(default=0)
    correct_count = IntegerField(default=0)
    incorrect_count = IntegerField(default=0)
    unanswered_count = IntegerField(default=0)
    score_percent = FloatField(default=0.0)
    pool_note = TextField(default="")
    started_at = DateTimeField(default=utcnow)
    submitted_at = DateTimeField(null=True)


class AttemptItem(BaseModel):
    attempt = ForeignKeyField(Attempt, on_delete="CASCADE", backref="items")
    question = ForeignKeyField(Question, on_delete="CASCADE", backref="attempt_items")
    position = IntegerField()
    selected_index = IntegerField(null=True)
    is_correct = BooleanField(null=True)
    is_repeat = BooleanField(default=False)

    class Meta:
        indexes = ((("attempt", "question"), True), (("attempt", "position"), True))


class QuestionHistory(BaseModel):
    """Every question a student has been shown, with running counts. Drives 'new questions first'."""

    user = ForeignKeyField(User, on_delete="CASCADE", backref="question_history")
    question = ForeignKeyField(Question, on_delete="CASCADE", backref="history")
    times_seen = IntegerField(default=0)
    times_correct = IntegerField(default=0)
    last_correct = BooleanField(null=True)
    last_seen_at = DateTimeField(null=True)

    class Meta:
        indexes = ((("user", "question"), True),)


class Resource(BaseModel):
    """Study material: an uploaded PDF or DOCX, an external link, or a written note."""

    course = ForeignKeyField(Course, null=True, on_delete="SET NULL", backref="resources")
    topic = ForeignKeyField(Topic, null=True, on_delete="SET NULL", backref="resources")
    title = CharField(max_length=200)
    resource_type = CharField(max_length=10)
    description = TextField(default="")
    learning_objectives = JSONField(default=list)
    skill_parameter = CharField(max_length=80, null=True)
    difficulty = CharField(max_length=10, null=True)
    external_url = CharField(max_length=500, null=True)
    file_path = CharField(max_length=255, null=True)
    original_filename = CharField(max_length=255, null=True)
    mime_type = CharField(max_length=100, null=True)
    size_bytes = IntegerField(null=True)
    sha256 = CharField(max_length=64, null=True, index=True)
    is_published = BooleanField(default=False, index=True)
    uploaded_by = ForeignKeyField(User, null=True, on_delete="SET NULL", backref="resources")


class ResourcePoint(BaseModel):
    """An important point taken from a resource, organised by topic."""

    resource = ForeignKeyField(Resource, on_delete="CASCADE", backref="points")
    topic = ForeignKeyField(Topic, null=True, on_delete="SET NULL", backref="points")
    text = TextField()
    is_key_concept = BooleanField(default=False)
    position = IntegerField(default=0)


class ResourceQuestion(BaseModel):
    """Links a resource to the MCQs that check it."""

    resource = ForeignKeyField(Resource, on_delete="CASCADE", backref="related_links")
    question = ForeignKeyField(Question, on_delete="CASCADE", backref="related_resource_links")

    class Meta:
        indexes = ((("resource", "question"), True),)


class ResourceView(BaseModel):
    """A student opened a resource. completed=True counts toward training completion."""

    user = ForeignKeyField(User, on_delete="CASCADE", backref="resource_views")
    resource = ForeignKeyField(Resource, on_delete="CASCADE", backref="views")
    viewed_at = DateTimeField(default=utcnow)
    completed = BooleanField(default=False)
    completed_at = DateTimeField(null=True)

    class Meta:
        indexes = ((("user", "resource"), True),)


class PointMark(BaseModel):
    """A student marked an important point."""

    user = ForeignKeyField(User, on_delete="CASCADE", backref="point_marks")
    point = ForeignKeyField(ResourcePoint, on_delete="CASCADE", backref="marks")

    class Meta:
        indexes = ((("user", "point"), True),)


class Book(BaseModel):
    title = CharField(max_length=200)
    author = CharField(max_length=160)
    description = TextField(default="")
    course = ForeignKeyField(Course, null=True, on_delete="SET NULL", backref="books")
    topic = ForeignKeyField(Topic, null=True, on_delete="SET NULL", backref="books")
    skill_tag = CharField(max_length=80, null=True)
    url = CharField(max_length=500)
    is_published = BooleanField(default=True)
    added_by = ForeignKeyField(User, null=True, on_delete="SET NULL", backref="books_added")


class SavedBook(BaseModel):
    user = ForeignKeyField(User, on_delete="CASCADE", backref="saved_books")
    book = ForeignKeyField(Book, on_delete="CASCADE", backref="saves")

    class Meta:
        indexes = ((("user", "book"), True),)


class StudentTopic(BaseModel):
    """A topic the student chose to study. Progress is never stored here: it is worked out from answers."""

    user = ForeignKeyField(User, on_delete="CASCADE", backref="selected_topics")
    topic = ForeignKeyField(Topic, on_delete="CASCADE", backref="selections")

    class Meta:
        indexes = ((("user", "topic"), True),)


class StudentNote(BaseModel):
    """Notes a student uploaded (PDF or DOCX) or pasted. Private: only the owner can see or open them."""

    user = ForeignKeyField(User, on_delete="CASCADE", backref="my_notes")
    course = ForeignKeyField(Course, null=True, on_delete="SET NULL", backref="student_notes")
    topic = ForeignKeyField(Topic, null=True, on_delete="SET NULL", backref="student_notes")
    title = CharField(max_length=200)
    kind = CharField(max_length=10)  # pdf, docx or text
    body = TextField(default="")  # the text of a pasted note
    original_filename = CharField(max_length=255, null=True)
    file_path = CharField(max_length=255, null=True)
    mime_type = CharField(max_length=100, null=True)
    size_bytes = IntegerField(null=True)
    sha256 = CharField(max_length=64, null=True, index=True)


class Recommendation(BaseModel):
    """A stored, rule-based recommendation. Its evidence holds the numbers it was based on."""

    user = ForeignKeyField(User, on_delete="CASCADE", backref="recommendations")
    course = ForeignKeyField(Course, on_delete="CASCADE", backref="recommendations")
    topic = ForeignKeyField(Topic, null=True, on_delete="SET NULL", backref="recommendations")
    kind = CharField(max_length=30)
    message = TextField()
    evidence = JSONField(default=dict)
    is_active = BooleanField(default=True, index=True)


class Creator(BaseModel):
    """A person shown on the About page. Starts as an editable placeholder."""

    name = CharField(max_length=120)
    role_title = CharField(max_length=120, default="Team member")
    description = TextField(default="")
    photo_path = CharField(max_length=255, null=True)
    photo_mime = CharField(max_length=50, null=True)
    position = IntegerField(default=0)
    is_placeholder = BooleanField(default=True)
    nickname = CharField(max_length=40, null=True)
    title = CharField(max_length=80, default="")
    intro = TextField(default="")
    theme_color = CharField(max_length=7, default="#BDF700")
    avatar = CharField(max_length=30, default="scholar")


ALL_MODELS = [
    User,
    Course,
    StudentProfile,
    Topic,
    Question,
    Attempt,
    AttemptItem,
    QuestionHistory,
    Resource,
    ResourcePoint,
    ResourceQuestion,
    ResourceView,
    PointMark,
    Book,
    SavedBook,
    Recommendation,
    Creator,
    StudentTopic,
    StudentNote,
]
