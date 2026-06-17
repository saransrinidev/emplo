"""Password reset endpoints.

Flow:
1. POST /password-reset/request - generates a reset token (returns it for now; in prod, email it)
2. POST /password-reset/confirm - validates token and sets new password
"""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.core.security import hash_password
from app.db.session import get_db
from app.models.password_reset import PasswordResetToken
from app.models.user import User

router = APIRouter(prefix="/password-reset", tags=["password-reset"])

TOKEN_EXPIRY_HOURS = 1


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirm(BaseModel):
    token: str
    new_password: str


class ResetResponse(BaseModel):
    message: str
    token: str | None = None  # exposed in dev; remove in production


@router.post("/request", response_model=ResetResponse)
@limiter.limit("3/minute")
def request_reset(
    request: Request,
    payload: ResetRequest,
    db: Session = Depends(get_db),
) -> ResetResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        # Don't reveal whether the email exists
        return ResetResponse(message="If the email exists, a reset link has been sent.")

    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)

    reset = PasswordResetToken(user_id=user.id, token=token, expires_at=expires)
    db.add(reset)
    db.commit()

    # In production: send email with reset link. For dev, return the token.
    return ResetResponse(
        message="If the email exists, a reset link has been sent.",
        token=token,  # REMOVE in production
    )


@router.post("/confirm", response_model=ResetResponse)
def confirm_reset(
    payload: ResetConfirm,
    db: Session = Depends(get_db),
) -> ResetResponse:
    reset = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token == payload.token)
    )
    if reset is None:
        raise HTTPException(400, "Invalid or expired token")
    if reset.used:
        raise HTTPException(400, "Token already used")
    if reset.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expired")

    user = db.get(User, reset.user_id)
    if user is None:
        raise HTTPException(400, "User not found")

    user.password_hash = hash_password(payload.new_password)
    reset.used = True
    db.commit()

    return ResetResponse(message="Password reset successfully.")
