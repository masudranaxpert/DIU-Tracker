"""Custom JWT login — allows inactive CR accounts (pending admin approval)."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from auth.setup import auth_backend, current_user_token_any, get_user_manager
from fastapi_users import exceptions
from fastapi_users.authentication import Strategy
from fastapi_users.manager import BaseUserManager
from fastapi_users.router.common import ErrorCode
from models import User
from utils.email import is_email_verification_enabled

router = APIRouter()


class EmailIn(BaseModel):
    email: EmailStr


@router.get("/config")
async def auth_config():
    """Public auth config the frontend reads to adapt the signup/verify flow."""
    return {"email_verification_enabled": is_email_verification_enabled()}


@router.post("/resend-verify")
async def resend_verify(
    body: EmailIn,
    user_manager: BaseUserManager[User, str] = Depends(get_user_manager),
):
    """Resend a verification email. Always 200 so account existence is not leaked."""
    if is_email_verification_enabled():
        try:
            user = await user_manager.get_by_email(body.email)
            if not user.is_verified:
                await user_manager.send_verification(user)
        except exceptions.UserNotExists:
            pass
    return {"ok": True}


@router.post("/login")
async def login(
    request: Request,
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager: BaseUserManager[User, str] = Depends(get_user_manager),
    strategy: Strategy = Depends(auth_backend.get_strategy),
):
    """Login even when is_active=False so pending CRs can reach /pending-approval."""
    user = await user_manager.authenticate(credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorCode.LOGIN_BAD_CREDENTIALS,
        )

    response = await auth_backend.login(strategy, user)
    await user_manager.on_after_login(user, request, response)
    return response


@router.post("/logout")
async def logout(
    user_token: tuple[User, str] = Depends(current_user_token_any),
    strategy: Strategy = Depends(auth_backend.get_strategy),
):
    """Logout works for inactive (pending) CR accounts too."""
    user, token = user_token
    return await auth_backend.logout(strategy, user, token)
