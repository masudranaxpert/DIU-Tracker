from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import crud, schemas
from services.push_tasks import run_notify_record

router = APIRouter(
    tags=["academic records"]
)

@router.get("/records", response_model=List[schemas.AcademicRecordResponse])
def read_records(
    batch_id: str, 
    section: str, 
    sub_section: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    return crud.get_records(db, batch_id=batch_id, section=section, sub_section=sub_section)

@router.post("/records", response_model=schemas.AcademicRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    record: schemas.AcademicRecordCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    created = crud.create_record(db, record)
    background_tasks.add_task(run_notify_record, created.id)
    return created

@router.put("/records/{record_id}", response_model=schemas.AcademicRecordResponse)
def update_record(record_id: str, updates: schemas.AcademicRecordUpdate, db: Session = Depends(get_db)):
    db_record = crud.update_record(db, record_id, updates)
    if db_record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return db_record

@router.delete("/records/{record_id}")
def delete_record(record_id: str, db: Session = Depends(get_db)):
    success = crud.delete_record(db, record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted successfully"}

@router.post("/records/{record_id}/views/increment")
def increment_views(record_id: str, db: Session = Depends(get_db)):
    views = crud.increment_record_views(db, record_id)
    return {"views": views}

# --- Attachment Endpoints ---
@router.post("/records/{record_id}/attachments", response_model=schemas.AttachmentResponse, status_code=status.HTTP_201_CREATED)
def create_attachment(record_id: str, attachment: schemas.AttachmentCreate, db: Session = Depends(get_db)):
    db_record = crud.get_record(db, record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Academic record not found")
    return crud.create_attachment(db, attachment, record_id)

@router.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: str, db: Session = Depends(get_db)):
    success = crud.delete_attachment(db, attachment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return {"message": "Attachment deleted successfully"}
