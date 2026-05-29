from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

import models, schemas
from crud._helpers import normalize_section_pin, norm_section
from utils.media_storage import AVATARS_STATIC_PREFIX, delete_static_media


def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_users(db: Session, is_cr: Optional[bool] = None, batch_id: Optional[str] = None):
    query = db.query(models.User)
    if is_cr is not None:
        query = query.filter(models.User.is_cr == is_cr)
    if batch_id:
        query = query.filter(models.User.batch_id == batch_id)
    return query.order_by(models.User.full_name).all()


def update_user(db: Session, user_id: str, updates: schemas.UserAdminUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    payload = updates.model_dump(exclude_unset=True)
    old_avatar = db_user.avatar_url
    if "avatar_url" in payload and payload["avatar_url"] != old_avatar:
        delete_static_media(old_avatar, AVATARS_STATIC_PREFIX)
    for key, value in payload.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: str):
    db_user = get_user(db, user_id)
    if not db_user:
        return False
    # Delete stored avatar file if present
    delete_static_media(db_user.avatar_url, AVATARS_STATIC_PREFIX)
    db.delete(db_user)
    db.commit()
    return True


def get_section_crs(db: Session, batch_id: str, section: str):
    return (
        db.query(models.User)
        .filter(
            models.User.batch_id == batch_id,
            models.User.section == section,
            models.User.is_cr == True,
            models.User.is_active == True,
        )
        .all()
    )


def get_section_pin(db: Session, batch_id: str, section: str):
    section_key = norm_section(section)
    return (
        db.query(models.SectionPin)
        .filter(
            models.SectionPin.batch_id == batch_id,
            models.SectionPin.section == section_key,
        )
        .first()
    )


def upsert_section_pin(
    db: Session,
    batch_id: str,
    section: str,
    pin: Optional[str],
    updated_by: Optional[str] = None,
):
    section_key = norm_section(section)
    row = get_section_pin(db, batch_id, section_key)
    pin_value = normalize_section_pin(pin)
    if row:
        row.pin = pin_value
        row.section = section_key
        row.updated_by = updated_by
        row.updated_at = datetime.utcnow()
    else:
        row = models.SectionPin(
            batch_id=batch_id,
            section=section_key,
            pin=pin_value,
            updated_by=updated_by,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def verify_section_pin(db: Session, batch_id: str, section: str, pin: str) -> bool:
    row = get_section_pin(db, batch_id, norm_section(section))
    if not row or not row.pin:
        return True
    try:
        entered = normalize_section_pin(pin)
    except ValueError:
        return False
    return row.pin == entered
