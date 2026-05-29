from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from auth.setup import current_user_optional
from models import User
import crud, schemas

router = APIRouter(
    prefix="/students",
    tags=["students"]
)


def _norm_section(value: Optional[str]) -> str:
    return (value or "").strip().upper()


def _ensure_section_access(user: Optional[User], batch_id: str, section: str) -> None:
    """Student directory is authenticated; users may only read their own batch+section."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to view the student directory.",
        )

    target_section = _norm_section(section)
    user_section = _norm_section(user.section)
    same_batch = (user.batch_id or "") == batch_id

    if user.is_cr:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your CR account is not active.",
            )
        if not user_section:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CR profile has no section assigned.",
            )
        if not (same_batch and user_section == target_section):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CRs can only view students from their own section.",
            )
        return

    if user_section:
        if not (same_batch and user_section == target_section):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view students from your own section.",
            )

@router.get("/lookup", response_model=schemas.StudentLookupResult)
def lookup_student_get(student_id: str, db: Session = Depends(get_db)):
    """Check if student ID already exists (GET)."""
    row = crud.lookup_student_by_id(db, student_id)
    if not row:
        return schemas.StudentLookupResult(found=False)
    return schemas.StudentLookupResult(found=True, name=row.name, phone=row.phone)


@router.post("/lookup", response_model=schemas.StudentLookupResult)
def lookup_student_post(body: schemas.StudentIdCheck, db: Session = Depends(get_db)):
    """Check if student ID already exists (POST)."""
    row = crud.lookup_student_by_id(db, body.student_id)
    if not row:
        return schemas.StudentLookupResult(found=False)
    return schemas.StudentLookupResult(found=True, name=row.name, phone=row.phone)


@router.post("/unlock", response_model=schemas.SectionPinUnlockResult)
def unlock_student_section(body: schemas.SectionPinUnlock, db: Session = Depends(get_db)):
    """Verify CR PIN and register/update student for section access."""
    section_key = str(body.section).strip().upper()
    if not crud.verify_section_pin(db, body.batch_id, section_key, body.pin):
        return schemas.SectionPinUnlockResult(
            valid=False,
            error="invalid_pin",
            message="Wrong CR PIN for this section. Ask your Class Representative for the correct 4-digit code.",
        )
    try:
        student = crud.register_student_with_pin(db, body)
    except ValueError as exc:
        return schemas.SectionPinUnlockResult(valid=False, error="registration", message=str(exc))
    if not student:
        return schemas.SectionPinUnlockResult(
            valid=False,
            error="invalid_pin",
            message="Could not unlock. Check your PIN and try again.",
        )
    return schemas.SectionPinUnlockResult(valid=True, student=student)


@router.get("", response_model=List[schemas.StudentResponse])
def read_students(
    batch_id: str,
    section: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(current_user_optional),
):
    _ensure_section_access(user, batch_id, section)
    return crud.get_students(db, batch_id, section)

@router.post("", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    return crud.create_student(db, student)

@router.post("/upsert", response_model=List[schemas.StudentResponse])
def upsert_students(students: List[schemas.StudentCreate], db: Session = Depends(get_db)):
    return crud.upsert_students(db, students)

@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_student(student_id: str, updates: schemas.StudentUpdate, db: Session = Depends(get_db)):
    db_student = crud.update_student(db, student_id, updates)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    success = crud.delete_student(db, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted successfully"}
