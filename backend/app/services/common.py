"""Helpers shared by routes and services: lookups, slugs and the performance-status rules."""

import re

from fastapi import HTTPException

from app.db.models import StudentProfile, User

MIN_EVIDENCE = 3  # answers needed before a topic is judged across several tests
STRONG_AT = 70.0  # accuracy (%) at or above which a topic counts as a strong area
WEAK_BELOW = 50.0  # accuracy (%) below which a topic counts as a weak area / missing skill


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:140] or "item"


def get_or_404(model, pk: int, message: str):
    obj = model.get_or_none(model.id == pk)
    if obj is None:
        raise HTTPException(status_code=404, detail=message)
    return obj


def accuracy(correct: int, total: int) -> float | None:
    """Percentage rounded to one decimal place, or None when there is nothing to measure."""
    return round(100.0 * correct / total, 1) if total else None


def status_for(percent: float | None, answered: int, min_evidence: int = MIN_EVIDENCE) -> str:
    if answered == 0 or percent is None:
        return "not_assessed"
    if answered < min_evidence:
        return "limited_data"
    if percent >= STRONG_AT:
        return "strong"
    if percent < WEAK_BELOW:
        return "weak"
    return "developing"


def ensure_profile(user: User) -> StudentProfile:
    profile = StudentProfile.get_or_none(StudentProfile.user == user)
    if profile is None:
        profile = StudentProfile.create(user=user)
    return profile
