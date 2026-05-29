"""CR file uploads to Google Drive (rclone accounts)."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from auth.setup import fastapi_users
from database import get_db
from models import User
from rclone.drive_files import MAX_UPLOAD_BYTES, friendly_drive_error, mime_to_attachment_type, upload_bytes_to_drive
from rclone.storage import (
    delete_drive_file_for_attachment,
    get_access_token,
    list_ready_active_accounts,
    pick_upload_account_for_size,
)

router = APIRouter(prefix="/drive", tags=["drive"])

current_authenticated_user = fastapi_users.current_user(active=True, verified=False)


def _require_cr(user: User) -> None:
    if not user.is_cr:
        raise HTTPException(status_code=403, detail="Only CR users can manage Drive attachments")


@router.get("/status")
def drive_upload_status(
    db: Session = Depends(get_db),
    user: User = Depends(current_authenticated_user),
):
    _require_cr(user)
    ready = list_ready_active_accounts(db)
    if not ready:
        return {
            "ready": False,
            "active_accounts": 0,
            "message": "Google Drive is not configured. Please ask your super admin to set up Rclone in the admin panel.",
        }
    return {
        "ready": True,
        "active_accounts": len(ready),
        "message": None,
    }


class StagedDeleteBody(BaseModel):
    drive_file_id: Optional[str] = None
    rclone_account_id: Optional[str] = None
    file_url: Optional[str] = None


@router.post("/staged-delete")
def delete_staged_drive_file(
    body: StagedDeleteBody,
    db: Session = Depends(get_db),
    user: User = Depends(current_authenticated_user),
):
    """Remove a file uploaded before the record was saved (X on attachment card)."""
    _require_cr(user)
    if not body.drive_file_id and not body.file_url:
        return {"ok": True, "deleted": True}
    try:
        deleted = delete_drive_file_for_attachment(
            db,
            body.drive_file_id,
            body.rclone_account_id,
            body.file_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=friendly_drive_error(str(exc))) from exc
    if not deleted:
        raise HTTPException(
            status_code=400,
            detail="Could not delete file from Google Drive. Check Rclone setup and try again.",
        )
    return {"ok": True, "deleted": True}


@router.post("/upload")
async def upload_attachment_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_authenticated_user),
):
    _require_cr(user)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File must be under {MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )

    filename = file.filename or "upload.bin"
    mime = file.content_type or None

    try:
        account = pick_upload_account_for_size(db, len(content))
        access = get_access_token(db, account)
        uploaded = upload_bytes_to_drive(
            access,
            filename,
            content,
            mime,
            account_cache_key=account.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=friendly_drive_error(str(exc))) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=friendly_drive_error(str(exc)),
        ) from exc

    att_type = mime_to_attachment_type(uploaded.get("mime_type") or "", filename)
    return {
        "url": uploaded["url"],
        "type": att_type,
        "drive_file_id": uploaded.get("file_id"),
        "account_id": account.id,
        "filename": filename,
    }
