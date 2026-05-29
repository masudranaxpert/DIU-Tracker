from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

import models, schemas


def _record_query(db: Session):
    return db.query(models.AcademicRecord).options(
        joinedload(models.AcademicRecord.creator),
        joinedload(models.AcademicRecord.attachments),
    )


def get_records(db: Session, batch_id: str, section: str, sub_section: Optional[str] = None):
    query = _record_query(db).filter(
        models.AcademicRecord.batch_id == batch_id,
        models.AcademicRecord.section == section,
    )
    if sub_section:
        query = query.filter(
            or_(
                models.AcademicRecord.sub_section.is_(None),
                models.AcademicRecord.sub_section == sub_section,
            )
        )
    return query.order_by(models.AcademicRecord.date.desc()).all()


def get_record(db: Session, record_id: str):
    return _record_query(db).filter(models.AcademicRecord.id == record_id).first()


def create_record(db: Session, record: schemas.AcademicRecordCreate):
    db_record = models.AcademicRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    return get_record(db, db_record.id)


def update_record(db: Session, record_id: str, updates: schemas.AcademicRecordUpdate):
    db_record = get_record(db, record_id)
    if not db_record:
        return None
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(db_record, key, value)
    db.commit()
    return get_record(db, record_id)


def delete_record(db: Session, record_id: str):
    db_record = get_record(db, record_id)
    if not db_record:
        return False
    db.delete(db_record)
    db.commit()
    return True


def increment_views(db: Session, record_id: str):
    db_record = get_record(db, record_id)
    if db_record:
        db_record.views += 1
        db.commit()
        db.refresh(db_record)
    return db_record.views if db_record else 0


def increment_record_views(db: Session, record_id: str):
    return increment_views(db, record_id)


def create_attachment(db: Session, attachment: schemas.AttachmentCreate, record_id: str):
    db_attachment = models.RecordAttachment(**attachment.model_dump(), record_id=record_id)
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment


def delete_attachment(db: Session, attachment_id: str):
    db_attachment = (
        db.query(models.RecordAttachment)
        .filter(models.RecordAttachment.id == attachment_id)
        .first()
    )
    if not db_attachment:
        return False

    file_id = db_attachment.public_id or db_attachment.url
    if file_id or db_attachment.url:
        from rclone.storage import delete_drive_file_for_attachment

        try:
            delete_drive_file_for_attachment(
                db,
                db_attachment.public_id,
                db_attachment.rclone_account_id,
                db_attachment.url,
            )
        except ValueError:
            pass

    db.delete(db_attachment)
    db.commit()
    return True
