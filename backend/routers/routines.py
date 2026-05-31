from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud, schemas

router = APIRouter(
    prefix="/routines",
    tags=["routines"]
)

@router.get("", response_model=List[schemas.RoutineItemResponse])
def read_routines(batch_id: str, section: str, db: Session = Depends(get_db)):
    return crud.get_routines(db, batch_id, section)

@router.post("", response_model=List[schemas.RoutineItemResponse])
def save_routine(payload: schemas.RoutineSaveRequest, db: Session = Depends(get_db)):
    try:
        return crud.save_routine(db, payload.batch_id, payload.section, payload.classes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("")
def delete_routine(batch_id: str, section: str, db: Session = Depends(get_db)):
    success = crud.delete_routine(db, batch_id, section)
    if not success:
        raise HTTPException(status_code=404, detail="Routine not found")
    return {"message": "Routine deleted successfully"}
