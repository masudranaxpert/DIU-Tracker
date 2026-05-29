from typing import Optional

from fastapi_users import schemas
from pydantic import field_validator, model_validator


class UserRead(schemas.BaseUser[str]):
    full_name: Optional[str] = None
    student_id: Optional[str] = None
    batch_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    is_cr: bool = False
    avatar_url: Optional[str] = None
    facebook_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_chat_id: Optional[str] = None


class UserCreate(schemas.BaseUserCreate):
    full_name: Optional[str] = None
    student_id: Optional[str] = None
    batch_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    is_cr: bool = False

    @field_validator("student_id", mode="before")
    @classmethod
    def normalize_sid(cls, v):
        if v is None or v == "":
            return None
        return str(v).strip().upper()

    @model_validator(mode="after")
    def cr_requires_student_id(self):
        if self.is_cr and not self.student_id:
            raise ValueError("Student ID is required for CR application.")
        return self


class UserUpdate(schemas.BaseUserUpdate):
    full_name: Optional[str] = None
    batch_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    avatar_url: Optional[str] = None
    facebook_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_chat_id: Optional[str] = None
