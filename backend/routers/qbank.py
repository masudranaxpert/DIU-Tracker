from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services import qbank_submission_cache as qb_cache

router = APIRouter(prefix="/qbank", tags=["qbank"])



@router.get("/pdfs", response_model=schemas.QbPaginatedPdfsResponse)
def qb_list_pdfs(
    department: Optional[str] = None,
    course: Optional[str] = None,
    semester: Optional[str] = None,
    exam_type: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
):
    query = db.query(models.QbPdf)

    if department:
        query = query.filter(models.QbPdf.department == department)
    if course:
        query = query.filter(models.QbPdf.course_name == course)
    if semester:
        query = query.filter(models.QbPdf.semester_name == semester)
    if exam_type:
        query = query.filter(models.QbPdf.exam_type == exam_type)

    if q:
        needle = f"%{q.strip().lower()}%"
        query = query.filter(
            (models.QbPdf.pdf_url.ilike(needle))
            | (cast(models.QbPdf.question_external_id, String).ilike(needle))
        )

    total = query.count()
    total_pages = (total + limit - 1) // limit if total else 0
    items = (
        query.order_by(models.QbPdf.scraped_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.get("/pdf-filters", response_model=schemas.QbPdfFiltersResponse)
def qb_pdf_filters(db: Session = Depends(get_db)):
    departments = [
        r[0]
        for r in db.query(models.QbPdf.department)
        .filter(models.QbPdf.department.isnot(None))
        .distinct()
        .order_by(models.QbPdf.department.asc())
        .all()
    ]
    courses = [
        r[0]
        for r in db.query(models.QbPdf.course_name)
        .filter(models.QbPdf.course_name.isnot(None))
        .distinct()
        .order_by(models.QbPdf.course_name.asc())
        .all()
    ]
    semesters = [
        r[0]
        for r in db.query(models.QbPdf.semester_name)
        .filter(models.QbPdf.semester_name.isnot(None))
        .distinct()
        .order_by(models.QbPdf.semester_name.desc())
        .all()
    ]
    exam_types = [
        r[0]
        for r in db.query(models.QbPdf.exam_type)
        .filter(models.QbPdf.exam_type.isnot(None))
        .distinct()
        .order_by(models.QbPdf.exam_type.asc())
        .all()
    ]
    return {"departments": departments, "courses": courses, "semesters": semesters, "exam_types": exam_types}


@router.get("/questions/{question_id}/submissions", response_model=schemas.QbSubmissionsResponse)
def qb_question_submissions(question_id: int, db: Session = Depends(get_db)):
    """Return cached PDF links (24h TTL). If missing or expired, refresh runs in background."""
    cached = qb_cache.get_cached_submissions(db, question_id)
    if cached:
        return {
            "question_id": question_id,
            "submissions": cached,
            "status": "ready",
            "from_cache": True,
        }

    err = qb_cache.get_refresh_error(question_id)
    if err and not qb_cache.is_refresh_running(question_id):
        return {
            "question_id": question_id,
            "submissions": [],
            "status": "error",
            "from_cache": False,
            "error": err,
        }

    qb_cache.start_refresh_job(question_id)

    return {
        "question_id": question_id,
        "submissions": [],
        "status": "refreshing",
        "from_cache": False,
    }


@router.post("/questions/{question_id}/submissions/refresh", response_model=schemas.QbSubmissionsResponse)
def qb_force_refresh_submissions(question_id: int, db: Session = Depends(get_db)):
    """Force a background re-scrape (e.g. user clicked Retry)."""
    qb_cache.delete_question_cache(db, question_id)
    qb_cache.start_refresh_job(question_id, force=True)
    return {
        "question_id": question_id,
        "submissions": [],
        "status": "refreshing",
        "from_cache": False,
    }

