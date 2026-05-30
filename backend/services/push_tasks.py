"""Background FCM jobs (own DB session)."""

from database import SessionLocal
import models
from services.push_notify import notify_new_deadline, notify_new_notice, notify_new_record


def run_notify_notice(notice_id: str) -> None:
    db = SessionLocal()
    try:
        row = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
        if row:
            notify_new_notice(db, row)
    finally:
        db.close()


def run_notify_record(record_id: str) -> None:
    db = SessionLocal()
    try:
        row = db.query(models.AcademicRecord).filter(models.AcademicRecord.id == record_id).first()
        if row:
            notify_new_record(db, row)
    finally:
        db.close()


def run_notify_deadline(deadline_id: str) -> None:
    db = SessionLocal()
    try:
        row = db.query(models.Deadline).filter(models.Deadline.id == deadline_id).first()
        if row:
            notify_new_deadline(db, row)
    finally:
        db.close()
