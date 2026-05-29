from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import crud, schemas

router = APIRouter(
    prefix="/notices",
    tags=["notices"]
)

@router.get("", response_model=List[schemas.NoticeResponse])
def read_notices(
    batch_id: str, 
    section: Optional[str] = None, 
    sub_section: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    return crud.get_notices(db, batch_id, section, sub_section)

@router.post("", response_model=schemas.NoticeResponse, status_code=status.HTTP_201_CREATED)
def create_notice(notice: schemas.NoticeCreate, db: Session = Depends(get_db)):
    return crud.create_notice(db, notice)

@router.put("/{notice_id}", response_model=schemas.NoticeResponse)
def update_notice(notice_id: str, updates: schemas.NoticeUpdate, db: Session = Depends(get_db)):
    db_notice = crud.update_notice(db, notice_id, updates)
    if db_notice is None:
        raise HTTPException(status_code=404, detail="Notice not found")
    return db_notice

@router.delete("/{notice_id}")
def delete_notice(notice_id: str, db: Session = Depends(get_db)):
    success = crud.delete_notice(db, notice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"message": "Notice deleted successfully"}
