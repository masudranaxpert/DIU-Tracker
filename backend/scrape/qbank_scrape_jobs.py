"""Background job: sync DIUQBank questions into the local index.

We read the public questions list pages (Inertia data), which already include
each question's department / course / semester / exam type / submissions count.
This lets a single sync capture every question quickly without hitting each
question's detail page (which is slow and easily rate-limited)."""
from __future__ import annotations

import threading
import time
import uuid
from datetime import datetime
from typing import Any, Optional

from database import SessionLocal
import models
from scrape.qbank_scrape import scrape_questions_index

BASE_URL = "https://diuqbank.com"
QUESTIONS_URL = f"{BASE_URL}/questions"

_lock = threading.Lock()
_job: Optional[dict[str, Any]] = None


def _set(**kwargs: Any) -> None:
    global _job
    with _lock:
        if _job is not None:
            _job.update(kwargs)


def get_status() -> dict[str, Any]:
    with _lock:
        if _job is None:
            return {
                "job_id": None,
                "status": "idle",
                "phase": "",
                "current": 0,
                "total": 0,
                "created": 0,
                "updated": 0,
                "message": "No sync running",
                "errors": [],
                "started_at": None,
                "finished_at": None,
            }
        return dict(_job)


def start_scrape(max_pages: int = 60) -> dict[str, Any]:
    global _job
    with _lock:
        if _job and _job.get("status") == "running":
            return {"ok": False, "error": "Question Bank sync is already running", "job": dict(_job)}

        job_id = str(uuid.uuid4())
        _job = {
            "job_id": job_id,
            "status": "running",
            "phase": "starting",
            "current": 0,
            "total": 0,
            "created": 0,
            "updated": 0,
            "message": "Starting Question Bank sync...",
            "errors": [],
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": None,
        }

    thread = threading.Thread(target=_run, args=(job_id, max(1, min(200, int(max_pages or 60)))), daemon=True)
    thread.start()
    return {"ok": True, "job_id": job_id}


def _get_html(session, url: str) -> str:
    resp = session.get(
        url,
        headers={
            "Referer": f"{BASE_URL}/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code} for {url}")
    return resp.text or ""


def _run(job_id: str, max_pages: int) -> None:
    db = SessionLocal()
    try:
        import httpcloak

        created = 0
        updated = 0
        errors: list[str] = []

        _set(phase="connecting", message="Connecting to DIUQBank...")

        with httpcloak.Session(preset="chrome-latest") as session:
            page = 1
            while page <= max_pages:
                _set(phase="index", current=page, message=f"Reading questions page {page}/{max_pages}...")
                try:
                    html = _get_html(session, f"{QUESTIONS_URL}?page={page}")
                    questions, _filters, meta = scrape_questions_index(html)
                except Exception as exc:
                    errors.append(f"Page {page}: {exc}")
                    break

                if page == 1:
                    last_page = int(meta.get("last_page") or max_pages)
                    max_pages = min(max_pages, max(1, last_page))
                    _set(total=int(meta.get("total") or 0))

                if not questions:
                    break

                for question in questions:
                    question_url = f"{QUESTIONS_URL}/{question.id}"
                    department = question.department.short_name or question.department.name or None
                    course_name = question.course.name or None
                    semester_name = question.semester.name or None
                    exam_type = question.exam_type.name or None

                    existing = (
                        db.query(models.QbPdf)
                        .filter(models.QbPdf.pdf_url == question_url)
                        .first()
                    )
                    if existing:
                        existing.question_external_id = question.id
                        existing.department = department
                        existing.course_name = course_name
                        existing.semester_name = semester_name
                        existing.exam_type = exam_type
                        existing.submissions_count = question.submissions_count
                        existing.scraped_at = question.created_at or datetime.utcnow()
                        updated += 1
                    else:
                        db.add(
                            models.QbPdf(
                                question_external_id=question.id,
                                pdf_url=question_url,
                                department=department,
                                course_name=course_name,
                                semester_name=semester_name,
                                exam_type=exam_type,
                                submissions_count=question.submissions_count,
                                scraped_at=question.created_at or datetime.utcnow(),
                            )
                        )
                        created += 1

                db.commit()
                _set(message=f"Synced page {page}/{max_pages} - {created} added, {updated} updated...")
                page += 1
                time.sleep(0.4)

        _set(
            status="completed",
            phase="done",
            created=created,
            updated=updated,
            errors=errors[:20],
            message=f"Sync complete: {created} added, {updated} updated.",
            finished_at=datetime.utcnow().isoformat(),
        )
    except Exception as exc:
        db.rollback()
        _set(
            status="failed",
            phase="error",
            message=str(exc),
            errors=[str(exc)],
            finished_at=datetime.utcnow().isoformat(),
        )
    finally:
        db.close()
