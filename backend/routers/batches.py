from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud, schemas

router = APIRouter(
    prefix="/batches",
    tags=["batches"]
)

@router.get("", response_model=List[schemas.BatchResponse])
def read_batches(db: Session = Depends(get_db)):
    return crud.get_batches(db)

@router.post("", response_model=schemas.BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(batch: schemas.BatchCreate, db: Session = Depends(get_db)):
    return crud.create_batch(db, batch)
