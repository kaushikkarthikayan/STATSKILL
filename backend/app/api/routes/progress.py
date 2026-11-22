"""Progress report, dashboard data and rule-based recommendations for the logged-in student."""

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser
from app.db.models import Course
from app.services import learning, recommendations
from app.services.common import ensure_profile, get_or_404
from app.services.progress import build_dashboard, build_report

router = APIRouter(tags=["Progress and recommendations"])


def _course_for(user, course_id: int | None):
    profile = ensure_profile(user)
    if course_id is not None:
        return profile, get_or_404(Course, course_id, "Course not found.")
    if profile.current_course is None:
        raise HTTPException(400, "Choose the course you are preparing for in your profile first.")
    return profile, profile.current_course


@router.get("/progress/report")
def progress_report(user: CurrentUser, course_id: int | None = Query(default=None, gt=0)):
    profile, course = _course_for(user, course_id)
    report = build_report(user, profile, course)
    report["recommendations"] = recommendations.active(user.id, course.id)
    report.update(learning.report_extras(user, course))
    return report


@router.get("/dashboard")
def dashboard(user: CurrentUser):
    return build_dashboard(user, ensure_profile(user))


@router.get("/recommendations")
def list_recommendations(user: CurrentUser, course_id: int | None = Query(default=None, gt=0)):
    _, course = _course_for(user, course_id)
    return recommendations.active(user.id, course.id)


@router.post("/recommendations/refresh")
def refresh_recommendations(user: CurrentUser, course_id: int | None = Query(default=None, gt=0)):
    _, course = _course_for(user, course_id)
    return recommendations.refresh(user, course)
