import json
from datetime import datetime

from sqlalchemy.orm import Session

import models
import schemas
from services.academic_calendar import parse_calendar_events


def get_academic_calendar(db: Session) -> models.AcademicCalendar:
    row = db.query(models.AcademicCalendar).filter(models.AcademicCalendar.id == "default").first()
    if row:
        return row
    row = models.AcademicCalendar(
        id="default",
        title="Academic Calendar",
        markdown="",
        events_json="[]",
        show_on_calendar_view=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def save_academic_calendar(
    db: Session,
    payload: schemas.AcademicCalendarUpdate,
    updated_by: str | None = None,
) -> models.AcademicCalendar:
    row = get_academic_calendar(db)
    if payload.title is not None:
        row.title = payload.title.strip() or "Academic Calendar"
    if payload.markdown is not None:
        row.markdown = payload.markdown
        events = parse_calendar_events(payload.markdown)
        row.events_json = json.dumps(events)
    if payload.show_on_calendar_view is not None:
        row.show_on_calendar_view = payload.show_on_calendar_view
    row.updated_by = updated_by
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row
