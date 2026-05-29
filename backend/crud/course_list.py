import math
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models, schemas


def _course_list_query(db: Session, q: Optional[str] = None):
    query = db.query(models.CourseList)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.CourseList.code.ilike(term),
                models.CourseList.name.ilike(term),
            )
        )
    return query


def get_course_list_items(db: Session, q: Optional[str] = None):
    return _course_list_query(db, q).order_by(models.CourseList.code).all()


def list_course_list_admin(
    db: Session,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    query = _course_list_query(db, q)
    total = query.count()
    rows = (
        query.order_by(models.CourseList.code)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    items = [schemas.CourseListResponse.model_validate(row) for row in rows]
    total_pages = max(1, math.ceil(total / limit)) if total else 1
    return schemas.PaginatedCourseListResponse(
        items=items, total=total, page=page, limit=limit, total_pages=total_pages
    )


def get_course_list_item(db: Session, item_id: str):
    return db.query(models.CourseList).filter(models.CourseList.id == item_id).first()


def get_course_list_by_code(db: Session, code: str):
    return db.query(models.CourseList).filter(models.CourseList.code == code).first()


def create_course_list_item(db: Session, item: schemas.CourseListCreate):
    db_item = models.CourseList(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_course_list_item(db: Session, item_id: str) -> bool:
    db_item = get_course_list_item(db, item_id)
    if not db_item:
        return False
    db.delete(db_item)
    db.commit()
    return True
