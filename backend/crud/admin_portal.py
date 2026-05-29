"""Paginated list queries for super-admin portal."""
import math
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models, schemas
from crud._helpers import cr_names_for_section, norm_section
from crud.batches import get_batch


def list_students_admin(
    db: Session,
    batch_id: Optional[str] = None,
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    query = db.query(models.Student)
    if batch_id:
        query = query.filter(models.Student.batch_id == batch_id)
    if section:
        query = query.filter(models.Student.section == norm_section(section))
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.Student.name.ilike(term),
                models.Student.student_id.ilike(term),
                models.Student.phone.ilike(term),
            )
        )
    total = query.count()
    rows = (
        query.order_by(models.Student.name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    batch_cache: dict[str, Optional[str]] = {}
    items = []
    for row in rows:
        batch_name = None
        if row.batch_id:
            if row.batch_id not in batch_cache:
                b = get_batch(db, row.batch_id)
                batch_cache[row.batch_id] = b.name if b else None
            batch_name = batch_cache[row.batch_id]
        cr_names = cr_names_for_section(db, row.batch_id, row.section)
        items.append(
            schemas.StudentAdminItem(
                id=row.id,
                student_id=row.student_id,
                name=row.name,
                phone=row.phone,
                batch_id=row.batch_id,
                section=row.section,
                sub_section=row.sub_section,
                section_pin=row.section_pin,
                created_at=row.created_at,
                batch_name=batch_name,
                cr_names=cr_names,
            )
        )
    total_pages = max(1, math.ceil(total / limit)) if total else 1
    return schemas.PaginatedStudentAdminResponse(
        items=items, total=total, page=page, limit=limit, total_pages=total_pages
    )


def list_teacher_profiles_admin(
    db: Session,
    batch_id: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    del batch_id  # teachers are global; filter param kept for API compatibility
    query = db.query(models.TeacherProfile)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.TeacherProfile.name.ilike(term),
                models.TeacherProfile.designation.ilike(term),
                models.TeacherProfile.department.ilike(term),
                models.TeacherProfile.email.ilike(term),
                models.TeacherProfile.contact_number.ilike(term),
                models.TeacherProfile.room_no.ilike(term),
            )
        )
    total = query.count()
    rows = (
        query.order_by(models.TeacherProfile.name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    items = [
        schemas.TeacherProfileAdminItem(
            id=row.id,
            name=row.name,
            designation=row.designation,
            department=row.department,
            contact_number=row.contact_number,
            email=row.email,
            room_no=row.room_no,
            profile_url=row.profile_url,
            avatar_url=row.avatar_url,
            created_at=row.created_at,
        )
        for row in rows
    ]
    total_pages = max(1, math.ceil(total / limit)) if total else 1
    return schemas.PaginatedTeacherProfileAdminResponse(
        items=items, total=total, page=page, limit=limit, total_pages=total_pages
    )


def list_feedbacks_admin(
    db: Session,
    batch_id: Optional[str] = None,
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    query = db.query(models.Feedback)
    if batch_id:
        query = query.filter(models.Feedback.batch_id == batch_id)
    if section:
        query = query.filter(models.Feedback.section == norm_section(section))
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.Feedback.message.ilike(term),
                models.Feedback.category.ilike(term),
                models.Feedback.author_name.ilike(term),
            )
        )
    total = query.count()
    rows = (
        query.order_by(models.Feedback.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    batch_cache: dict[str, Optional[str]] = {}
    items = []
    for row in rows:
        batch_name = None
        if row.batch_id:
            if row.batch_id not in batch_cache:
                b = get_batch(db, row.batch_id)
                batch_cache[row.batch_id] = b.name if b else None
            batch_name = batch_cache[row.batch_id]
        items.append(
            schemas.FeedbackAdminItem(
                id=row.id,
                batch_id=row.batch_id,
                section=row.section,
                message=row.message,
                category=row.category,
                rating=row.rating,
                is_anonymous=row.is_anonymous,
                author_name=row.author_name,
                author_session=row.author_session,
                created_at=row.created_at,
                batch_name=batch_name,
            )
        )
    total_pages = max(1, math.ceil(total / limit)) if total else 1
    return schemas.PaginatedFeedbackAdminResponse(
        items=items, total=total, page=page, limit=limit, total_pages=total_pages
    )


def list_crs_admin(
    db: Session,
    is_active: Optional[bool] = None,
    batch_id: Optional[str] = None,
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
):
    query = db.query(models.User).filter(models.User.is_cr == True)
    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)
    if batch_id:
        query = query.filter(models.User.batch_id == batch_id)
    if section:
        query = query.filter(models.User.section == norm_section(section))
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.User.full_name.ilike(term),
                models.User.email.ilike(term),
            )
        )
    total = query.count()
    rows = (
        query.order_by(models.User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    batch_cache: dict[str, Optional[str]] = {}
    items = []
    for row in rows:
        batch_name = None
        if row.batch_id:
            if row.batch_id not in batch_cache:
                b = get_batch(db, row.batch_id)
                batch_cache[row.batch_id] = b.name if b else None
            batch_name = batch_cache[row.batch_id]
        items.append(
            schemas.CRAdminItem(
                id=str(row.id),
                email=row.email,
                full_name=row.full_name,
                batch_id=row.batch_id,
                section=row.section,
                sub_section=row.sub_section,
                is_cr=row.is_cr,
                is_active=row.is_active,
                is_verified=row.is_verified,
                avatar_url=row.avatar_url,
                facebook_url=row.facebook_url,
                whatsapp_number=row.whatsapp_number,
                telegram_username=row.telegram_username,
                telegram_chat_id=row.telegram_chat_id,
                created_at=row.created_at,
                batch_name=batch_name,
            )
        )
    total_pages = max(1, math.ceil(total / limit)) if total else 1
    return schemas.PaginatedCRAdminResponse(
        items=items, total=total, page=page, limit=limit, total_pages=total_pages
    )
