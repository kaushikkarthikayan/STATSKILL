"""Account helpers used by the admin script and by tests."""

from app.core.security import hash_password
from app.db.models import StudentProfile, User
from app.schemas import check_password_strength


def ensure_admin(email: str, full_name: str, password: str) -> str:
    """Creates an administrator, or promotes an existing account. Never changes an existing password."""
    email = email.strip().lower()
    existing = User.get_or_none(User.email == email)
    if existing is not None:
        existing.role = "admin"
        existing.is_active = True
        existing.save()
        return f"{email} is now an administrator. Its password was not changed."
    check_password_strength(password)
    user = User.create(
        email=email,
        full_name=full_name.strip(),
        password_hash=hash_password(password),
        role="admin",
    )
    StudentProfile.create(user=user)
    return f"Administrator account created for {email}."
