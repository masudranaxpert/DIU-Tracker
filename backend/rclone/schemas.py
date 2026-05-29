from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RcloneAccountCreate(BaseModel):
    client_id: str = Field(..., min_length=10)
    client_secret: str = Field(..., min_length=10)
    redirect_uri: str = Field(default="http://localhost")
    label: Optional[str] = None


class RcloneAuthUrlResponse(BaseModel):
    account_id: str
    authorization_url: str
    redirect_uri: str
    scope: str


class RcloneAuthorizeRequest(BaseModel):
    redirect_url: str = Field(..., min_length=3)


class RcloneAccountResponse(BaseModel):
    id: str
    label: Optional[str] = None
    client_id: str
    redirect_uri: str
    authorized_email: Optional[str] = None
    is_active: bool = True
    token_status: str
    has_refresh_token: bool = False
    is_authorized: bool = False
    storage_total_gb: Optional[float] = None
    storage_used_gb: Optional[float] = None
    storage_free_gb: Optional[float] = None
    quota_checked_at: Optional[datetime] = None
    token_updated_at: Optional[datetime] = None
    created_at: datetime
    last_error: Optional[str] = None


class RcloneAccountListResponse(BaseModel):
    items: list[RcloneAccountResponse]
    total: int


class RcloneAuthorizeResponse(BaseModel):
    success: bool
    message: str
    account: RcloneAccountResponse


class RcloneAccountPatch(BaseModel):
    is_active: Optional[bool] = None
    label: Optional[str] = None
