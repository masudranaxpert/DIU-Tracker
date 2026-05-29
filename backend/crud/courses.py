from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

import models, schemas


def _course_to_response(course: models.Course) -> schemas.CourseResponse:
    cl = course.course_list
    return schemas.CourseResponse(
        id=course.id,
        batch_id=course.batch_id,
        course_list_id=course.course_list_id,
        code=cl.code if cl else "",
        name=cl.name if cl else "",
        teacher=course.teacher,
        teacher2=course.teacher2,
        section=course.section,
        sub_section=course.sub_section,
        credit=course.credit,
        created_at=course.created_at,
    )


def get_courses(db: Session, batch_id: Optional[str] = None, section: Optional[str] = None):
    query = db.query(models.Course).options(joinedload(models.Course.course_list))
    if batch_id:
        query = query.filter(models.Course.batch_id == batch_id)
    if section:
        query = query.filter(
            or_(models.Course.section.is_(None), models.Course.section == section)
        )
    rows = query.all()
    rows.sort(key=lambda c: (c.course_list.code if c.course_list else ""))
    return [_course_to_response(c) for c in rows]


def get_course(db: Session, course_id: str):
    course = (
        db.query(models.Course)
        .options(joinedload(models.Course.course_list))
        .filter(models.Course.id == course_id)
        .first()
    )
    if not course:
        return None
    return _course_to_response(course)


def get_course_model(db: Session, course_id: str):
    return db.query(models.Course).filter(models.Course.id == course_id).first()


def create_course(db: Session, course: schemas.CourseCreate):
    catalog = db.query(models.CourseList).filter(models.CourseList.id == course.course_list_id).first()
    if not catalog:
        raise HTTPException(status_code=400, detail="Invalid course from catalog")

    section = course.section
    dup = (
        db.query(models.Course)
        .filter(
            models.Course.batch_id == course.batch_id,
            models.Course.course_list_id == course.course_list_id,
            models.Course.section == section,
        )
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="This course is already registered for this section")

    credit = course.credit if course.credit is not None else catalog.default_credit
    db_course = models.Course(
        batch_id=course.batch_id,
        course_list_id=course.course_list_id,
        teacher=course.teacher,
        teacher2=course.teacher2,
        section=section,
        sub_section=course.sub_section,
        credit=credit,
    )
    db.add(db_course)
    db.commit()
    return get_course(db, db_course.id)


def update_course(db: Session, course_id: str, updates: schemas.CourseUpdate):
    db_course = get_course_model(db, course_id)
    if not db_course:
        return None

    data = updates.model_dump(exclude_unset=True)
    if "course_list_id" in data and data["course_list_id"]:
        catalog = (
            db.query(models.CourseList)
            .filter(models.CourseList.id == data["course_list_id"])
            .first()
        )
        if not catalog:
            raise HTTPException(status_code=400, detail="Invalid course from catalog")

    for key, value in data.items():
        setattr(db_course, key, value)

    if db_course.credit is None and db_course.course_list_id:
        catalog = db.query(models.CourseList).filter(models.CourseList.id == db_course.course_list_id).first()
        if catalog:
            db_course.credit = catalog.default_credit

    db.commit()
    db.refresh(db_course)
    return get_course(db, course_id)


def delete_course(db: Session, course_id: str):
    db_course = get_course_model(db, course_id)
    if not db_course:
        return False
    db.delete(db_course)
    db.commit()
    return True
