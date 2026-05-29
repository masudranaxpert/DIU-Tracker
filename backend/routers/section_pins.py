from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from auth.setup import fastapi_users
from database import get_db
from models import User
import crud, schemas

router = APIRouter(tags=["section-pins"])

current_user_optional = fastapi_users.current_user(active=False, verified=False, optional=True)
current_authenticated_user = fastapi_users.current_user(active=False, verified=False)


def _cr_section(user: User) -> tuple[str, str]:
    if not user.batch_id or not user.section:
        raise HTTPException(
            status_code=400,
            detail="Your CR profile must have batch and section assigned. Contact admin.",
        )
    return str(user.batch_id), str(user.section).strip().upper()


@router.get("/section-pin", response_model=schemas.SectionPinStatus)
def read_section_pin(
    batch_id: str,
    section: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(current_user_optional),
):
    section_key = str(section).strip().upper()
    row = crud.get_section_pin(db, batch_id, section_key)
    pin_required = bool(row and row.pin)
    section_pin = None
    if user and user.is_cr:
        cr_batch, cr_section = _cr_section(user)
        if cr_batch == batch_id and cr_section == section_key:
            section_pin = row.pin if row else None
    return schemas.SectionPinStatus(pin_required=pin_required, section_pin=section_pin)


@router.put("/section-pin", response_model=schemas.SectionPinStatus)
def update_section_pin(
    body: schemas.SectionPinUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_authenticated_user),
):
    if not user.is_cr:
        raise HTTPException(status_code=403, detail="Only CR users can set section PIN")

    cr_batch, cr_section = _cr_section(user)
    section_key = str(body.section).strip().upper()
    if body.batch_id != cr_batch or section_key != cr_section:
        raise HTTPException(
            status_code=403,
            detail=f"You can only manage PIN for your assigned section ({cr_section}). Switch to your batch and section.",
        )

    try:
        row = crud.upsert_section_pin(
            db, cr_batch, cr_section, body.section_pin, updated_by=str(user.id)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return schemas.SectionPinStatus(
        pin_required=bool(row.pin),
        section_pin=row.pin,
    )


def _student_lookup_result(db: Session, student_id: str) -> schemas.StudentLookupResult:
    row = crud.lookup_student_by_id(db, student_id)
    if not row:
        return schemas.StudentLookupResult(found=False)
    return schemas.StudentLookupResult(found=True, name=row.name, phone=row.phone)


@router.get("/section-pin/student-lookup", response_model=schemas.StudentLookupResult)
def lookup_student_for_unlock_get(student_id: str, db: Session = Depends(get_db)):
    """Check if student ID exists (GET)."""
    return _student_lookup_result(db, student_id)


@router.post("/section-pin/student-lookup", response_model=schemas.StudentLookupResult)
def lookup_student_for_unlock_post(body: schemas.StudentIdCheck, db: Session = Depends(get_db)):
    """Check if student ID exists (POST — reliable with CORS/preflight)."""
    return _student_lookup_result(db, body.student_id)


@router.post("/section-pin/verify", response_model=schemas.SectionPinVerifyResult)
def verify_section_pin(body: schemas.SectionPinVerify, db: Session = Depends(get_db)):
    valid = crud.verify_section_pin(db, body.batch_id, body.section, body.pin)
    return schemas.SectionPinVerifyResult(valid=valid)


@router.post("/section-pin/unlock", response_model=schemas.SectionPinUnlockResult)
def unlock_section_with_student(body: schemas.SectionPinUnlock, db: Session = Depends(get_db)):
    """Verify PIN, register student in DB, and return student profile."""
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
        return schemas.SectionPinUnlockResult(
            valid=False,
            error="registration",
            message=str(exc),
        )
    if not student:
        return schemas.SectionPinUnlockResult(
            valid=False,
            error="invalid_pin",
            message="Could not unlock. Check your PIN and try again.",
        )
    return schemas.SectionPinUnlockResult(valid=True, student=student)


@router.post("/section-pin/student-logout")
def student_section_logout(student_db_id: str = Query(...), db: Session = Depends(get_db)):
    """Clear section access fields when student logs out."""
    if not crud.clear_student_section_access(db, student_db_id):
        raise HTTPException(status_code=404, detail="Student not found")
    return {"ok": True}
