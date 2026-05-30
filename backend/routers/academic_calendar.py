import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import crud, schemas
from services.academic_calendar import strip_events_block

router = APIRouter(tags=["academic-calendar"])


@router.get("/academic-calendar", response_model=schemas.AcademicCalendarResponse)
def read_academic_calendar(db: Session = Depends(get_db)):
    row = crud.get_academic_calendar(db)
    events = []
    if row.events_json:
        try:
            events = json.loads(row.events_json)
        except json.JSONDecodeError:
            events = []
    return schemas.AcademicCalendarResponse(
        id=row.id,
        title=row.title,
        markdown=row.markdown,
        display_markdown=strip_events_block(row.markdown),
        events=events,
        show_on_calendar_view=getattr(row, "show_on_calendar_view", True),
        updated_at=row.updated_at,
        updated_by=row.updated_by,
    )
