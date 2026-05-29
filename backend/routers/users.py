from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from auth.schemas import UserRead
from auth.setup import fastapi_users
from database import get_db
from models import User
import crud, schemas
from utils.media_storage import AVATARS_STATIC_PREFIX, delete_static_media

router = APIRouter(tags=["users"])

current_user_pending = fastapi_users.current_user(active=False, verified=False)


@router.get("/users/me", response_model=UserRead)
async def read_users_me(
    user: User = Depends(current_user_pending),
    db: Session = Depends(get_db),
):
    """Current user profile — always read fresh from DB (includes avatar_url)."""
    db_user = crud.get_user(db, str(user.id))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.patch("/users/me", response_model=UserRead)
def patch_users_me(
    updates: schemas.UserProfilePatch,
    user: User = Depends(current_user_pending),
    db: Session = Depends(get_db),
):
    """Update own profile (avatar, socials, name) — works for inactive CR too."""
    db_user = crud.get_user(db, str(user.id))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    payload = updates.model_dump(exclude_unset=True)
    old_avatar = db_user.avatar_url
    if "avatar_url" in payload and payload["avatar_url"] != old_avatar:
        delete_static_media(old_avatar, AVATARS_STATIC_PREFIX)
    for key, value in payload.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/users", response_model=List[schemas.UserPublicResponse])
def list_users(
    is_cr: Optional[bool] = None,
    batch_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.get_users(db, is_cr=is_cr, batch_id=batch_id)


@router.get("/users/{user_id}", response_model=schemas.UserPublicResponse)
def read_user(user_id: str, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.put("/users/{user_id}", response_model=schemas.UserPublicResponse)
def admin_update_user(user_id: str, updates: schemas.UserAdminUpdate, db: Session = Depends(get_db)):
    db_user = crud.update_user(db, user_id, updates)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(user_id: str, db: Session = Depends(get_db)):
    if not crud.delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")


@router.get("/batches/{batch_id}/sections/{section}/crs", response_model=List[schemas.UserPublicResponse])
def read_section_crs(batch_id: str, section: str, db: Session = Depends(get_db)):
    return crud.get_section_crs(db, batch_id, section)
