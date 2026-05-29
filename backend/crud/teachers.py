from sqlalchemy.orm import Session

import models, schemas
from utils.media_storage import TEACHERS_STATIC_PREFIX, delete_static_media, normalize_department


def get_teacher_profiles(db: Session):
    return db.query(models.TeacherProfile).order_by(models.TeacherProfile.name).all()


def get_teacher_profile(db: Session, profile_id: str):
    return db.query(models.TeacherProfile).filter(models.TeacherProfile.id == profile_id).first()


def create_teacher_profile(db: Session, profile: schemas.TeacherProfileCreate):
    data = profile.model_dump()
    if data.get("department") is not None:
        data["department"] = normalize_department(data["department"])
    db_profile = models.TeacherProfile(**data)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


def update_teacher_profile(db: Session, profile_id: str, updates: schemas.TeacherProfileUpdate):
    db_profile = get_teacher_profile(db, profile_id)
    if not db_profile:
        return None

    old_avatar = db_profile.avatar_url
    payload = updates.model_dump(exclude_unset=True)
    if "department" in payload and payload["department"] is not None:
        payload["department"] = normalize_department(payload["department"])

    new_avatar = payload.get("avatar_url")
    if new_avatar is not None and new_avatar != old_avatar:
        delete_static_media(old_avatar, TEACHERS_STATIC_PREFIX)

    for key, value in payload.items():
        setattr(db_profile, key, value)

    db.commit()
    db.refresh(db_profile)
    return db_profile


def delete_teacher_profile(db: Session, profile_id: str):
    db_profile = get_teacher_profile(db, profile_id)
    if not db_profile:
        return False
    delete_static_media(db_profile.avatar_url, TEACHERS_STATIC_PREFIX)
    db.delete(db_profile)
    db.commit()
    return True
