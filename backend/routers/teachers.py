from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from routers.admin_auth import get_current_admin
import crud, schemas

router = APIRouter(
    prefix="/teachers",
    tags=["teachers"],
)


@router.get("", response_model=List[schemas.TeacherProfileResponse])
def read_teacher_profiles(db: Session = Depends(get_db)):
    """Public read-only global faculty directory."""
    return crud.get_teacher_profiles(db)


@router.post("", response_model=schemas.TeacherProfileResponse, status_code=status.HTTP_201_CREATED)
def create_teacher_profile(
    profile: schemas.TeacherProfileCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Create teacher profile — admin only."""
    return crud.create_teacher_profile(db, profile)


@router.put("/{profile_id}", response_model=schemas.TeacherProfileResponse)
def update_teacher_profile(
    profile_id: str,
    updates: schemas.TeacherProfileUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Update teacher profile — admin only."""
    db_profile = crud.update_teacher_profile(db, profile_id, updates)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return db_profile


@router.delete("/{profile_id}")
def delete_teacher_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Delete teacher profile — admin only."""
    success = crud.delete_teacher_profile(db, profile_id)
    if not success:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return {"message": "Teacher profile deleted successfully"}
