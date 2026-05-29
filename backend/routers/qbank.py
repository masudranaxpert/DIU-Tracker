from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

BASE_URL = "https://diuqbank.com"


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

    # Minimal search: matches the URL or question id
    if q:
        needle = f"%{q.strip().lower()}%"
        query = query.filter(
            (models.QbPdf.pdf_url.ilike(needle))
            | (models.QbPdf.question_external_id.cast(models.String).ilike(needle))
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
def qb_question_submissions(question_id: int):
    """Fetch the direct PDF links for a single question, on demand.

    DIUQBank keeps the actual PDFs on each question's detail page, so we scrape
    that page live only when a user opens a specific question (avoids mass
    scraping / rate-limits during sync)."""
    import httpcloak

    from scrape.qbank_scrape import scrape_question_show

    url = f"{BASE_URL}/questions/{question_id}"
    try:
        with httpcloak.Session(preset="chrome-latest") as session:
            resp = session.get(
                url,
                headers={
                    "Referer": f"{BASE_URL}/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"HTTP {resp.status_code}")
            _question, submissions = scrape_question_show(resp.text or "")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not load submissions: {exc}") from exc

    items = [
        {
            "id": s.id,
            "pdf_url": s.pdf_url,
            "section": s.section,
            "uploader": (s.user or {}).get("name"),
        }
        for s in submissions
        if s.pdf_url
    ]
    return {"question_id": question_id, "submissions": items}
