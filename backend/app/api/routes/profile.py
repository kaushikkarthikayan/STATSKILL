"""The student's own profile: details, avatar and theme, the course being prepared for, and preferences."""

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser
from app.db.models import Course, User
from app.schemas import ProfileUpdate
from app.services.common import ensure_profile, get_or_404
from app.services.options import AVATAR_IDS, PREFERENCE_IDS, THEME_IDS, as_options

router = APIRouter(prefix="/profile", tags=["Student profile"])


def _completion(user: User, profile) -> dict:
    """How much of the profile is filled in, from the saved data itself."""
    checks = {
        "avatar": bool(profile.avatar),
        "theme": bool(profile.theme),
        "name": len(user.full_name.strip()) >= 2,
        "college": bool(profile.college),
        "graduation_year": profile.graduation_year is not None,
        "course": profile.current_course_id is not None,
        "interests": bool(profile.interests),
        "preferences": bool(profile.learning_preferences),
        "bio": bool(profile.bio),
    }
    return {"percent": round(100 * sum(checks.values()) / len(checks)), "missing": [k for k, ok in checks.items() if not ok]}


def _profile_out(user: User, profile) -> dict:
    course = profile.current_course
    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "college": profile.college,
        "graduation_year": profile.graduation_year,
        "current_course": {"id": course.id, "name": course.name} if course else None,
        "interests": profile.interests or [],
        "bio": profile.bio,
        "avatar": profile.avatar,
        "theme": profile.theme,
        "learning_preferences": profile.learning_preferences or [],
        "completion": _completion(user, profile),
        "member_since": user.created_at,
    }


@router.get("/options")
def profile_options(user: CurrentUser):
    """The avatars, themes and preference choices the profile builder offers."""
    return as_options()


@router.get("")
def get_profile(user: CurrentUser):
    return _profile_out(user, ensure_profile(user))


@router.put("")
def update_profile(payload: ProfileUpdate, user: CurrentUser):
    profile = ensure_profile(user)
    # exclude_unset: only the fields the student actually sent are changed.
    changes = payload.model_dump(exclude_unset=True)

    if "avatar" in changes and changes["avatar"] is not None and changes["avatar"] not in AVATAR_IDS:
        raise HTTPException(422, "Choose one of the listed avatars.")
    if "theme" in changes and changes["theme"] is not None and changes["theme"] not in THEME_IDS:
        raise HTTPException(422, "Choose one of the listed themes.")
    preferences = changes.get("learning_preferences")
    if preferences is not None:
        unknown = [p for p in preferences if p not in PREFERENCE_IDS]
        if unknown:
            raise HTTPException(422, f"Unknown learning preference: {', '.join(unknown)}.")

    if changes.get("full_name"):
        user.full_name = changes["full_name"]
        user.save()

    if "current_course_id" in changes:
        course_id = changes["current_course_id"]
        if course_id is None:
            profile.current_course = None
        else:
            course = get_or_404(Course, course_id, "Course not found.")
            if not course.is_published:
                raise HTTPException(400, "That course is not open for enrolment yet.")
            profile.current_course = course

    for field in ("college", "graduation_year", "interests", "bio", "avatar", "theme"):
        if field in changes:
            setattr(profile, field, changes[field])
    if "learning_preferences" in changes:
        profile.learning_preferences = list(dict.fromkeys(preferences or []))
    profile.save()
    return _profile_out(user, profile)
