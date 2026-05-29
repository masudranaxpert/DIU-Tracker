from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models, schemas


def get_notices(
    db: Session,
    batch_id: str,
    section: Optional[str] = None,
    sub_section: Optional[str] = None,
):
    query = db.query(models.Notice).filter(models.Notice.batch_id == batch_id)
    if section:
        if sub_section:
            query = query.filter(
                or_(
                    models.Notice.section.is_(None),
                    models.Notice.section == section,
                )
            )
        else:
            query = query.filter(
                or_(models.Notice.section.is_(None), models.Notice.section == section)
            )
    return query.order_by(models.Notice.created_at.desc()).all()


def _normalize_content(value: Optional[str]) -> str:
    return (value or "").strip()


def create_notice(db: Session, notice: schemas.NoticeCreate):
    data = notice.model_dump()
    data["content"] = _normalize_content(data.get("content"))
    db_notice = models.Notice(**data)
    db.add(db_notice)
    db.commit()
    db.refresh(db_notice)
    return db_notice


def update_notice(db: Session, notice_id: str, updates: schemas.NoticeUpdate):
    db_notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not db_notice:
        return None
    for key, value in updates.model_dump(exclude_unset=True).items():
        if key == "content":
            value = _normalize_content(value)
        setattr(db_notice, key, value)
    db.commit()
    db.refresh(db_notice)
    return db_notice


def delete_notice(db: Session, notice_id: str):
    db_notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not db_notice:
        return False
    db.delete(db_notice)
    db.commit()
    return True
