"""Request and response shapes. The validation rules here are shared by every route."""

import re
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator, model_validator

Difficulty = Literal["easy", "medium", "hard"]
Level = Literal["beginner", "intermediate", "advanced"]
ShortText = Annotated[str, Field(min_length=1, max_length=80)]
ShortItem = Annotated[str, Field(min_length=1, max_length=300)]
ParamValue = str | int | float | bool


def check_password_strength(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password is too long. Use 72 bytes or fewer.")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one number.")
    return value


def check_passwords_match(password: str, confirm: str) -> None:
    if password != confirm:
        raise ValueError("Passwords do not match.")


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


class TokenOut(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


# ---------- Authentication ----------

class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Please enter your full name.")
        return cleaned

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return check_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        check_passwords_match(self.password, self.confirm_password)
        return self


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    remember_me: bool = False


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return check_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        check_passwords_match(self.password, self.confirm_password)
        return self


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return check_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        check_passwords_match(self.new_password, self.confirm_password)
        return self


# ---------- Profile ----------

class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    college: str | None = Field(default=None, max_length=160)
    graduation_year: int | None = Field(default=None, ge=1950, le=2100)
    current_course_id: int | None = Field(default=None, gt=0)
    interests: Annotated[list[ShortItem], Field(max_length=20)] | None = None
    bio: str | None = Field(default=None, max_length=1000)
    avatar: str | None = Field(default=None, max_length=30)
    theme: str | None = Field(default=None, max_length=30)
    learning_preferences: Annotated[list[Annotated[str, Field(min_length=1, max_length=40)]], Field(max_length=20)] | None = None


# ---------- Courses and topics ----------

class CourseIn(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=5000)
    level: Level = "beginner"
    duration_weeks: int = Field(default=8, ge=1, le=104)
    required_skills: list[ShortText] = Field(default_factory=list, max_length=30)
    training_parameters: dict[str, ParamValue] = Field(default_factory=dict)
    is_published: bool = True


class CourseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    level: Level | None = None
    duration_weeks: int | None = Field(default=None, ge=1, le=104)
    required_skills: Annotated[list[ShortText], Field(max_length=30)] | None = None
    training_parameters: dict[str, ParamValue] | None = None
    is_published: bool | None = None


class TopicIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    skill_area: ShortText = "General"
    description: str = Field(default="", max_length=2000)
    learning_objectives: list[ShortItem] = Field(default_factory=list, max_length=20)


class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    skill_area: ShortText | None = None
    description: str | None = Field(default=None, max_length=2000)
    learning_objectives: Annotated[list[ShortItem], Field(max_length=20)] | None = None


# ---------- Questions ----------

class QuestionIn(BaseModel):
    topic_id: int = Field(gt=0)
    code: str | None = Field(default=None, min_length=3, max_length=24, pattern=r"^[A-Za-z0-9_-]+$")
    skill: ShortText = "General"
    difficulty: Difficulty = "medium"
    text: str = Field(min_length=5, max_length=1000)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0, le=5)
    explanation: str = Field(default="", max_length=2000)
    is_sample: bool = False
    is_active: bool = True

    @model_validator(mode="after")
    def check_options(self):
        cleaned = [option.strip() for option in self.options]
        if any(not option or len(option) > 300 for option in cleaned):
            raise ValueError("Every option needs text of 300 characters or fewer.")
        if len({option.lower() for option in cleaned}) != len(cleaned):
            raise ValueError("Options must be different from each other.")
        if self.correct_index >= len(cleaned):
            raise ValueError("The correct answer must match one of the options.")
        self.options = cleaned
        return self


class QuestionUpdate(BaseModel):
    topic_id: int | None = Field(default=None, gt=0)
    skill: ShortText | None = None
    difficulty: Difficulty | None = None
    text: str | None = Field(default=None, min_length=5, max_length=1000)
    options: Annotated[list[str], Field(min_length=2, max_length=6)] | None = None
    correct_index: int | None = Field(default=None, ge=0, le=5)
    explanation: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


# ---------- Tests and practice ----------

class AttemptStartIn(BaseModel):
    course_id: int = Field(gt=0)
    mode: Literal["assessment", "practice", "revision"] = "assessment"
    topic_id: int | None = Field(default=None, gt=0)
    topic_ids: Annotated[list[int], Field(max_length=50)] | None = None
    difficulty: Difficulty | None = None
    count: int = Field(default=10, ge=1, le=50)


class AnswerIn(BaseModel):
    selected_index: int | None = Field(default=None, ge=0, le=5)


# ---------- Study material ----------

class ResourceLinkIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    resource_type: Literal["link", "note"] = "link"
    course_id: int | None = Field(default=None, gt=0)
    topic_id: int | None = Field(default=None, gt=0)
    description: str = Field(default="", max_length=5000)
    learning_objectives: list[ShortItem] = Field(default_factory=list, max_length=20)
    skill_parameter: str | None = Field(default=None, max_length=80)
    difficulty: Difficulty | None = None
    external_url: HttpUrl | None = None
    is_published: bool = False

    @model_validator(mode="after")
    def check_type_fields(self):
        if self.resource_type == "link" and self.external_url is None:
            raise ValueError("A link resource needs an external_url.")
        if self.resource_type == "note" and not self.description.strip():
            raise ValueError("A note needs its text in the description field.")
        return self


class ResourceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    topic_id: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=5000)
    learning_objectives: Annotated[list[ShortItem], Field(max_length=20)] | None = None
    skill_parameter: str | None = Field(default=None, max_length=80)
    difficulty: Difficulty | None = None
    external_url: HttpUrl | None = None
    is_published: bool | None = None


class PointIn(BaseModel):
    text: str = Field(min_length=3, max_length=500)
    is_key_concept: bool = False
    topic_id: int | None = Field(default=None, gt=0)


class PointsIn(BaseModel):
    points: list[PointIn] = Field(min_length=1, max_length=50)


class CompletionIn(BaseModel):
    completed: bool = True


# ---------- Books ----------

class BookIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    author: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=2000)
    course_id: int | None = Field(default=None, gt=0)
    topic_id: int | None = Field(default=None, gt=0)
    skill_tag: str | None = Field(default=None, max_length=80)
    url: HttpUrl
    is_published: bool = True


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    author: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    course_id: int | None = Field(default=None, gt=0)
    topic_id: int | None = Field(default=None, gt=0)
    skill_tag: str | None = Field(default=None, max_length=80)
    url: HttpUrl | None = None
    is_published: bool | None = None
