from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud, schemas
from services.push_tasks import run_notify_deadline

router = APIRouter(
    prefix="/deadlines",
    tags=["deadlines"]
)

@router.get("", response_model=List[schemas.DeadlineResponse])
def read_deadlines(batch_id: str, db: Session = Depends(get_db)):
    return crud.get_deadlines(db, batch_id)

@router.post("", response_model=schemas.DeadlineResponse, status_code=status.HTTP_201_CREATED)
def create_deadline(
    deadline: schemas.DeadlineCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    created = crud.create_deadline(db, deadline)
    background_tasks.add_task(run_notify_deadline, created.id)
    return created

@router.put("/{deadline_id}", response_model=schemas.DeadlineResponse)
def update_deadline(deadline_id: str, updates: schemas.DeadlineUpdate, db: Session = Depends(get_db)):
    db_deadline = crud.update_deadline(db, deadline_id, updates)
    if db_deadline is None:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return db_deadline

@router.delete("/{deadline_id}")
def delete_deadline(deadline_id: str, db: Session = Depends(get_db)):
    success = crud.delete_deadline(db, deadline_id)
    if not success:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return {"message": "Deadline deleted successfully"}
