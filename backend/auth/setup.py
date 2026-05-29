import os
from typing import Any, Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, exceptions, models
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.jwt import generate_jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.schemas import UserCreate
from database import get_async_session
from models import User
from utils.email import is_email_verification_enabled, send_verification_email

# Fixed app secret for signing auth / verification / reset tokens.
# Hardcoded so deployment stays simple; override with AUTH_SECRET env only if needed.
SECRET = os.environ.get(
    "AUTH_SECRET",
    "9f3c1a7e6b2d48f0a5c9e1b7d3f6082a4c8e0d1f7b9a2c5e3d6f80147a2b9c4e",
)


def normalize_student_id(value: Optional[str]) -> str:
    return (value or "").strip().upper()


class UserManager(BaseUserManager[User, str]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    def parse_id(self, value: Any) -> str:
        return str(value)

    async def send_verification(self, user: User) -> None:
        """Email a verification link, bypassing the active check so pending CRs work."""
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "aud": self.verification_token_audience,
        }
        token = generate_jwt(
            token_data,
            self.verification_token_secret,
            self.verification_token_lifetime_seconds,
        )
        send_verification_email(user.email, token)

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        if user.is_cr and not user.is_verified and is_email_verification_enabled():
            await self.send_verification(user)

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        print(f"Reset token for {user.email}: {token}")

    async def on_after_request_verify(self, user: User, token: str, request: Optional[Request] = None):
        send_verification_email(user.email, token)

    async def _get_user_by_student_id(self, student_id: str) -> Optional[User]:
        sid = normalize_student_id(student_id)
        if not sid:
            return None
        statement = select(User).where(func.upper(User.student_id) == sid)
        result = await self.user_db.session.execute(statement)
        return result.scalar_one_or_none()

    async def _apply_pending_cr_update(
        self,
        user: User,
        user_create: UserCreate,
        password: str,
    ) -> User:
        """Update a pending CR re-application (student_id is the stable key; email may change)."""
        new_email = user_create.email.strip().lower()
        if new_email != (user.email or "").strip().lower():
            clash = await self.user_db.get_by_email(new_email)
            if clash is not None and str(clash.id) != str(user.id):
                raise exceptions.UserAlreadyExists()

        update_dict = {
            "email": new_email,
            "student_id": normalize_student_id(user_create.student_id) or user.student_id,
            "full_name": user_create.full_name or user.full_name,
            "batch_id": user_create.batch_id or user.batch_id,
            "section": user_create.section or user.section,
            "sub_section": user_create.sub_section if user_create.sub_section is not None else user.sub_section,
            "is_cr": True,
            "is_active": False,
            "is_verified": False,
            "hashed_password": self.password_helper.hash(password),
        }
        return await self.user_db.update(user, update_dict)

    async def create(
        self,
        user_create: UserCreate,
        safe: bool = False,
        request: Optional[Request] = None,
    ) -> User:
        await self.validate_password(user_create.password, user_create)

        if user_create.is_cr:
            student_id = normalize_student_id(user_create.student_id)

            by_student = await self._get_user_by_student_id(student_id)
            if by_student is not None:
                if by_student.is_cr and by_student.is_active:
                    raise exceptions.UserAlreadyExists()
                if by_student.is_cr:
                    updated = await self._apply_pending_cr_update(
                        by_student, user_create, user_create.password
                    )
                    await self.on_after_register(updated, request)
                    return updated

            existing = await self.user_db.get_by_email(user_create.email)
            if existing is not None:
                if existing.is_cr and existing.is_active:
                    raise exceptions.UserAlreadyExists()
                if existing.is_cr and not existing.is_active:
                    updated = await self._apply_pending_cr_update(
                        existing, user_create, user_create.password
                    )
                    await self.on_after_register(updated, request)
                    return updated

        existing_user = await self.user_db.get_by_email(user_create.email)
        if existing_user is not None:
            raise exceptions.UserAlreadyExists()

        user_dict = (
            user_create.create_update_dict()
            if safe
            else user_create.create_update_dict_superuser()
        )
        password = user_dict.pop("password")
        email = user_dict.pop("email")
        user_dict.pop("is_active", None)
        user_dict.pop("is_superuser", None)
        user_dict.pop("is_verified", None)
        is_cr = user_dict.pop("is_cr", False)
        raw_sid = user_dict.pop("student_id", None)
        user_dict["email"] = email
        user_dict["is_cr"] = is_cr
        user_dict["student_id"] = normalize_student_id(raw_sid) if is_cr else None
        user_dict["is_active"] = False if is_cr else True
        user_dict["is_superuser"] = False
        user_dict["is_verified"] = False
        user_dict["hashed_password"] = self.password_helper.hash(password)

        created_user = await self.user_db.create(user_dict)
        await self.on_after_register(created_user, request)
        return created_user


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy[models.UP, models.ID]:
    return JWTStrategy(secret=SECRET, lifetime_seconds=60 * 60 * 24 * 7)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, str](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
current_cr_user = fastapi_users.current_user(active=True, verified=False)
current_user_token_any = fastapi_users.authenticator.current_user_token(
    active=False, verified=False
)
