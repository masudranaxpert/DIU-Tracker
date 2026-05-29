"""Admin batch listing, stats, and content purge."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

import models


def _batch_stats(db: Session, batch_id: str) -> dict[str, int]:
    return {
        "records": db.query(func.count(models.AcademicRecord.id)).filter(
            models.AcademicRecord.batch_id == batch_id
        ).scalar()
        or 0,
        "attachments": db.query(func.count(models.RecordAttachment.id))
        .join(models.AcademicRecord, models.RecordAttachment.record_id == models.AcademicRecord.id)
        .filter(models.AcademicRecord.batch_id == batch_id)
        .scalar()
        or 0,
        "courses": db.query(func.count(models.Course.id))
        .filter(models.Course.batch_id == batch_id)
        .scalar()
        or 0,
        "notices": db.query(func.count(models.Notice.id))
        .filter(models.Notice.batch_id == batch_id)
        .scalar()
        or 0,
        "deadlines": db.query(func.count(models.Deadline.id))
        .filter(models.Deadline.batch_id == batch_id)
        .scalar()
        or 0,
        "students": db.query(func.count(models.Student.id))
        .filter(models.Student.batch_id == batch_id)
        .scalar()
        or 0,
        "feedbacks": db.query(func.count(models.Feedback.id))
        .filter(models.Feedback.batch_id == batch_id)
        .scalar()
        or 0,
        "groups": db.query(func.count(models.CourseGroup.id))
        .filter(models.CourseGroup.batch_id == batch_id)
        .scalar()
        or 0,
        "group_members": db.query(func.count(models.GroupMember.id))
        .join(models.CourseGroup, models.GroupMember.group_id == models.CourseGroup.id)
        .filter(models.CourseGroup.batch_id == batch_id)
        .scalar()
        or 0,
    }


def list_batches_admin(db: Session, page: int = 1, limit: int = 10) -> dict[str, Any]:
    base = db.query(models.Batch).order_by(models.Batch.name)
    total = base.count()
    rows = base.offset((page - 1) * limit).limit(limit).all()
    items = []
    for row in rows:
        stats = _batch_stats(db, row.id)
        drive_attachments = (
            db.query(func.count(models.RecordAttachment.id))
            .join(models.AcademicRecord, models.RecordAttachment.record_id == models.AcademicRecord.id)
            .filter(models.AcademicRecord.batch_id == row.id)
            .filter(
                (models.RecordAttachment.public_id.isnot(None))
                | (models.RecordAttachment.url.ilike("%drive.google.com%"))
            )
            .scalar()
            or 0
        )
        items.append(
            {
                "id": row.id,
                "name": row.name,
                "created_at": row.created_at,
                "stats": {**stats, "drive_attachments": drive_attachments},
            }
        )
    total_pages = max(1, (total + limit - 1) // limit) if total else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


def get_batch_drive_attachments(db: Session, batch_id: str) -> list[models.RecordAttachment]:
    return (
        db.query(models.RecordAttachment)
        .join(models.AcademicRecord, models.RecordAttachment.record_id == models.AcademicRecord.id)
        .filter(models.AcademicRecord.batch_id == batch_id)
        .all()
    )


def purge_batch_database(db: Session, batch_id: str) -> dict[str, int]:
    """Remove all batch content; keep the batch row."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise ValueError("Batch not found")

    stats: dict[str, int] = {}
    record_ids = [
        r[0]
        for r in db.query(models.AcademicRecord.id).filter(models.AcademicRecord.batch_id == batch_id).all()
    ]
    if record_ids:
        stats["attachments"] = (
            db.query(models.RecordAttachment)
            .filter(models.RecordAttachment.record_id.in_(record_ids))
            .delete(synchronize_session=False)
        )
    else:
        stats["attachments"] = 0

    stats["records"] = (
        db.query(models.AcademicRecord).filter(models.AcademicRecord.batch_id == batch_id).delete(
            synchronize_session=False
        )
    )

    group_ids = [
        g[0]
        for g in db.query(models.CourseGroup.id).filter(models.CourseGroup.batch_id == batch_id).all()
    ]
    if group_ids:
        stats["group_members"] = (
            db.query(models.GroupMember)
            .filter(models.GroupMember.group_id.in_(group_ids))
            .delete(synchronize_session=False)
        )
    else:
        stats["group_members"] = 0
    stats["course_groups"] = (
        db.query(models.CourseGroup).filter(models.CourseGroup.batch_id == batch_id).delete(
            synchronize_session=False
        )
    )

    stats["deadlines"] = (
        db.query(models.Deadline).filter(models.Deadline.batch_id == batch_id).delete(synchronize_session=False)
    )
    stats["notices"] = (
        db.query(models.Notice).filter(models.Notice.batch_id == batch_id).delete(synchronize_session=False)
    )
    stats["feedbacks"] = (
        db.query(models.Feedback).filter(models.Feedback.batch_id == batch_id).delete(synchronize_session=False)
    )
    stats["students"] = (
        db.query(models.Student).filter(models.Student.batch_id == batch_id).delete(synchronize_session=False)
    )
    stats["courses"] = (
        db.query(models.Course).filter(models.Course.batch_id == batch_id).delete(synchronize_session=False)
    )
    stats["section_pins"] = (
        db.query(models.SectionPin).filter(models.SectionPin.batch_id == batch_id).delete(
            synchronize_session=False
        )
    )
    # CR accounts stay; they go back to pending approval (not deleted or unlinked)
    stats["crs_set_pending"] = (
        db.query(models.User)
        .filter(models.User.batch_id == batch_id, models.User.is_cr.is_(True))
        .update({models.User.is_active: False}, synchronize_session=False)
    )
    db.commit()
    return stats


def delete_batch_row(db: Session, batch_id: str) -> None:
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise ValueError("Batch not found")
    db.delete(batch)
    db.commit()
