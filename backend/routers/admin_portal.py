"""Super-admin portal API (JWT type=admin)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from routers.admin_auth import get_current_admin
from crud import batch_admin
from crud.batches import create_batch, get_batch
from services import batch_purge_jobs, teacher_scrape_jobs
from scrape import qbank_scrape_jobs
import crud, schemas
from utils.media_storage import TEACHERS_DIR
import models

router = APIRouter(prefix="/admin/portal", tags=["admin-portal"])


@router.get("/batches", response_model=schemas.PaginatedBatchAdminResponse)
def admin_list_batches(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return batch_admin.list_batches_admin(db, page=page, limit=limit)


@router.post("/batches", response_model=schemas.BatchResponse, status_code=201)
def admin_create_batch(
    batch: schemas.BatchCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return create_batch(db, batch)


@router.get("/batches/purge-jobs/{job_id}", response_model=schemas.BatchPurgeJobResponse)
def admin_get_batch_purge_job(
    job_id: str,
    _admin=Depends(get_current_admin),
):
    job = batch_purge_jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/batches/{batch_id}/purge", response_model=schemas.BatchPurgeJobResponse)
def admin_start_batch_purge(
    batch_id: str,
    body: schemas.BatchPurgeStartBody,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    job_id = batch_purge_jobs.start_batch_purge_job(
        batch_id, batch.name, include_drive=body.include_drive
    )
    job = batch_purge_jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=500, detail="Could not start purge job")
    return job


@router.delete("/batches/{batch_id}")
def admin_delete_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    try:
        batch_admin.delete_batch_row(db, batch_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@router.get("/students", response_model=schemas.PaginatedStudentAdminResponse)
def admin_list_students(
    batch_id: Optional[str] = None,
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return crud.list_students_admin(db, batch_id=batch_id, section=section, q=q, page=page, limit=limit)


@router.get("/course-list", response_model=schemas.PaginatedCourseListResponse)
def admin_list_course_catalog(
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return crud.list_course_list_admin(db, q=q, page=page, limit=limit)


@router.post("/course-list", response_model=schemas.CourseListResponse, status_code=201)
def admin_create_course_catalog_item(
    item: schemas.CourseListCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    existing = crud.get_course_list_by_code(db, item.code.strip())
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")
    return crud.create_course_list_item(db, item)


@router.delete("/course-list/{item_id}")
def admin_delete_course_catalog_item(
    item_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    if not crud.delete_course_list_item(db, item_id):
        raise HTTPException(status_code=404, detail="Course not found in catalog")
    return {"message": "Deleted"}


@router.get("/teacher-profiles", response_model=schemas.PaginatedTeacherProfileAdminResponse)
def admin_list_teacher_profiles(
    batch_id: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return crud.list_teacher_profiles_admin(db, batch_id=batch_id, q=q, page=page, limit=limit)


@router.delete("/teacher-profiles")
def admin_delete_all_teacher_profiles(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Dangerous: delete all teacher profiles + downloaded photos."""
    # Delete DB rows first (fast), then best-effort file cleanup.
    deleted = db.query(models.TeacherProfile).delete()
    db.commit()

    try:
        if TEACHERS_DIR.exists():
            for p in TEACHERS_DIR.glob("*"):
                if p.is_file():
                    try:
                        p.unlink()
                    except OSError:
                        pass
    except Exception:
        pass

    return {"ok": True, "deleted": deleted}


@router.post("/teacher-profiles/scrape")
def admin_start_teacher_scrape(_admin=Depends(get_current_admin)):
    result = teacher_scrape_jobs.start_scrape()
    if not result.get("ok"):
        raise HTTPException(status_code=409, detail=result.get("error", "Scrape already running"))
    return {"job_id": result["job_id"], "message": "Faculty scrape started in background"}


@router.get("/teacher-profiles/scrape/status", response_model=schemas.TeacherScrapeJobResponse)
def admin_teacher_scrape_status(_admin=Depends(get_current_admin)):
    return teacher_scrape_jobs.get_status()


@router.post("/qbank/scrape")
def admin_qbank_trigger_scrape(
    max_pages: int = Query(60, ge=1, le=200),
    _admin=Depends(get_current_admin),
):
    result = qbank_scrape_jobs.start_scrape(max_pages=max_pages)
    if not result.get("ok"):
        raise HTTPException(status_code=409, detail=result.get("error", "Question Bank sync already running"))
    return {"job_id": result["job_id"], "message": "Question Bank sync started in background"}


@router.get("/qbank/scrape/status", response_model=schemas.QbScrapeJobResponse)
def admin_qbank_scrape_status(_admin=Depends(get_current_admin)):
    return qbank_scrape_jobs.get_status()


@router.delete("/qbank/pdfs")
def admin_delete_qbank_pdfs(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    deleted = db.query(models.QbPdf).delete()
    db.commit()
    return {"ok": True, "deleted": deleted}


@router.get("/crs", response_model=schemas.PaginatedCRAdminResponse)
def admin_list_crs(
    is_active: Optional[bool] = None,
    batch_id: Optional[str] = None,
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return crud.list_crs_admin(
        db,
        is_active=is_active,
        batch_id=batch_id,
        section=section,
        q=q,
        page=page,
        limit=limit,
    )


@router.get("/feedbacks", response_model=schemas.PaginatedFeedbackAdminResponse)
def admin_list_feedbacks(
    batch_id: Optional[str] = None,
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return crud.list_feedbacks_admin(db, batch_id=batch_id, section=section, q=q, page=page, limit=limit)
