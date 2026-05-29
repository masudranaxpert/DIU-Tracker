from typing import List

from sqlalchemy.orm import Session

import models, schemas
from crud._helpers import normalize_section_pin, norm_section
from crud.users import verify_section_pin


def lookup_student_by_id(db: Session, student_id: str):
    sid = student_id.strip()
    if not sid:
        return None
    return db.query(models.Student).filter(models.Student.student_id == sid).first()


def register_student_with_pin(db: Session, payload: schemas.SectionPinUnlock):
    section_key = norm_section(payload.section)
    if not verify_section_pin(db, payload.batch_id, section_key, payload.pin):
        return None

    pin_value = normalize_section_pin(payload.pin)
    sid = payload.student_id.strip()
    existing = lookup_student_by_id(db, sid)

    name_in = (payload.name or "").strip()
    phone_in = (payload.phone or "").strip() or None

    if existing:
        name = name_in or existing.name
        phone = phone_in if payload.phone is not None else existing.phone
    else:
        if not name_in:
            raise ValueError("Full name is required for new students")
        name = name_in
        phone = phone_in

    data = {
        "student_id": sid,
        "name": name,
        "phone": phone,
        "batch_id": payload.batch_id,
        "section": section_key,
        "sub_section": payload.sub_section,
        "section_pin": pin_value,
    }
    if existing:
        for key, value in data.items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing

    db_student = models.Student(**data)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


def clear_student_section_access(db: Session, student_db_id: str):
    student = db.query(models.Student).filter(models.Student.id == student_db_id).first()
    if not student:
        return False
    student.section_pin = None
    db.commit()
    return True


def get_students(db: Session, batch_id: str, section: str):
    section_key = norm_section(section)
    return (
        db.query(models.Student)
        .filter(
            models.Student.batch_id == batch_id,
            models.Student.section == section_key,
        )
        .order_by(models.Student.name)
        .all()
    )


def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(**student.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


def upsert_students(db: Session, students: List[schemas.StudentCreate]):
    result = []
    for s in students:
        existing = db.query(models.Student).filter(models.Student.student_id == s.student_id).first()
        if existing:
            for key, value in s.model_dump().items():
                setattr(existing, key, value)
            result.append(existing)
        else:
            db_student = models.Student(**s.model_dump())
            db.add(db_student)
            result.append(db_student)
    db.commit()
    for s in result:
        db.refresh(s)
    return result


def update_student(db: Session, student_id: str, updates: schemas.StudentUpdate):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not db_student:
        return None
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(db_student, key, value)
    db.commit()
    db.refresh(db_student)
    return db_student


def delete_student(db: Session, student_id: str):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not db_student:
        return False
    db.delete(db_student)
    db.commit()
    return True
