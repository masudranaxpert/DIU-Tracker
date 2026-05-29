import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from auth.setup import fastapi_users
from database import get_db
from models import User
from routers.admin_auth import get_current_admin
from utils.media_storage import (
    AVATARS_DIR,
    AVATARS_STATIC_PREFIX,
    TEACHERS_DIR,
    TEACHERS_STATIC_PREFIX,
    delete_static_media,
    ensure_upload_dirs,
)
import crud

router = APIRouter(prefix="/upload", tags=["uploads"])

current_authenticated_user = fastapi_users.current_user(active=False, verified=False)

ensure_upload_dirs()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _ext_for_content_type(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(content_type, ".jpg")


async def _read_image(file: UploadFile) -> bytes:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")
    return content


@router.post("/avatar")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(current_authenticated_user),
    db: Session = Depends(get_db),
):
    if not user.is_cr:
        raise HTTPException(status_code=403, detail="Only CR users can upload avatars")

    content = await _read_image(file)
    ext = _ext_for_content_type(file.content_type or "")

    db_user = crud.get_user(db, str(user.id))
    old_avatar = db_user.avatar_url if db_user else None

    filename = f"{user.id}_{uuid.uuid4().hex}{ext}"
    dest = AVATARS_DIR / filename
    dest.write_bytes(content)

    url = f"{AVATARS_STATIC_PREFIX}{filename}"
    # Persist new avatar URL first (avoid brief 404 window)
    if db_user:
        db_user.avatar_url = url
        db.commit()
        db.refresh(db_user)

    # Best-effort cleanup of previous file (after commit)
    if old_avatar and old_avatar != url:
        delete_static_media(old_avatar, AVATARS_STATIC_PREFIX)

    # Extra safety: remove any other old avatars for this user id
    try:
        for p in AVATARS_DIR.glob(f"{user.id}_*"):
            if p.is_file() and p.name != filename:
                try:
                    p.unlink()
                except OSError:
                    pass
    except Exception:
        pass

    absolute = f"{str(request.base_url).rstrip('/')}{url}"
    return {"url": url, "absolute_url": absolute, "filename": filename}


@router.post("/teacher")
async def upload_teacher_photo(
    request: Request,
    file: UploadFile = File(...),
    teacher_id: str = Form(...),
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin: upload/replace a teacher profile photo."""
    content = await _read_image(file)
    ext = _ext_for_content_type(file.content_type or "")

    db_profile = crud.get_teacher_profile(db, teacher_id)
    if not db_profile:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    if db_profile.avatar_url:
        delete_static_media(db_profile.avatar_url, TEACHERS_STATIC_PREFIX)

    filename = f"{teacher_id}_{uuid.uuid4().hex}{ext}"
    dest = TEACHERS_DIR / filename
    dest.write_bytes(content)

    url = f"{TEACHERS_STATIC_PREFIX}{filename}"
    db_profile.avatar_url = url
    db.commit()
    db.refresh(db_profile)

    absolute = f"{str(request.base_url).rstrip('/')}{url}"
    return {"url": url, "absolute_url": absolute, "filename": filename}
