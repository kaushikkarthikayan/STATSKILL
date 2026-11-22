"""Registration, login, logout, password reset and the current user."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from peewee import IntegrityError

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.security import (
    create_access_token,
    hash_password,
    hash_reset_token,
    new_reset_token,
    verify_password,
)
from app.db.database import database, utcnow
from app.db.models import StudentProfile, User
from app.schemas import (
    ChangePasswordIn,
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

RESET_REQUEST_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent. "
    "In local development the link is printed in the backend terminal."
)


def _user_out(user: User) -> UserOut:
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role)


def _session(user: User, remember_me: bool, message: str) -> TokenOut:
    token, expires_in = create_access_token(user.id, user.token_version, remember_me)
    return TokenOut(message=message, access_token=token, expires_in=expires_in, user=_user_out(user))


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn):
    email = payload.email.strip().lower()
    duplicate = "An account with this email already exists. Please log in instead."
    if User.select().where(User.email == email).exists():
        raise HTTPException(status.HTTP_409_CONFLICT, duplicate)
    try:
        with database.atomic():
            user = User.create(
                email=email,
                full_name=payload.full_name,
                password_hash=hash_password(payload.password),
                role="student",
            )
            StudentProfile.create(user=user)
    except IntegrityError:
        # Two sign-ups with the same email at the same moment: the unique index decides.
        raise HTTPException(status.HTTP_409_CONFLICT, duplicate)
    return _session(user, False, "Account created. Welcome to StatSkill AI!")


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn):
    user = User.get_or_none(User.email == payload.email.strip().lower())
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is disabled. Please contact an administrator.")
    user.last_login_at = utcnow()
    user.save()
    return _session(user, payload.remember_me, "Logged in successfully.")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return _user_out(user)


@router.post("/logout")
def logout(user: CurrentUser):
    # Raising the token version invalidates every token issued before this moment.
    user.token_version += 1
    user.save()
    return {"message": "You have been logged out."}


@router.post("/change-password", response_model=TokenOut)
def change_password(payload: ChangePasswordIn, user: CurrentUser):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password is incorrect.")
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1
    user.save()
    return _session(user, False, "Password changed. Your other sessions have been logged out.")


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn):
    user = User.get_or_none(User.email == payload.email.strip().lower())
    if user is not None and user.is_active:
        raw_token, token_hash = new_reset_token()
        user.reset_token_hash = token_hash
        user.reset_token_expires_at = utcnow() + timedelta(minutes=settings.RESET_TOKEN_MINUTES)
        user.save()
        if settings.PRINT_RESET_LINKS:
            link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
            print(
                f"[StatSkill AI] Password reset link for {user.email} "
                f"(valid {settings.RESET_TOKEN_MINUTES} minutes): {link}",
                flush=True,
            )
    # The same answer is given whether or not the account exists, so emails cannot be probed.
    return {"message": RESET_REQUEST_MESSAGE}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn):
    user = User.get_or_none(User.reset_token_hash == hash_reset_token(payload.token))
    expired = user is None or user.reset_token_expires_at is None or user.reset_token_expires_at < utcnow()
    if expired:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired. Please request a new one.")
    user.password_hash = hash_password(payload.password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    user.token_version += 1
    user.save()
    return {"message": "Your password has been reset. Please log in with the new password."}
