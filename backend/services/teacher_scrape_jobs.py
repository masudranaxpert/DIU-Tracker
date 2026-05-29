"""Background job: scrape DIU CSE faculty into teacher_profiles."""
from __future__ import annotations

import threading
import uuid
from datetime import datetime
from typing import Any, Optional

from database import SessionLocal
import models
from utils.media_storage import (
    TEACHERS_STATIC_PREFIX,
    delete_static_media,
    normalize_department,
)
from scrape.teacher_scrape import download_teacher_photo

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
                "message": "No scrape running",
                "errors": [],
                "started_at": None,
                "finished_at": None,
            }
        return dict(_job)


def start_scrape() -> dict[str, Any]:
    global _job
    with _lock:
        if _job and _job.get("status") == "running":
            return {"ok": False, "error": "A scrape is already in progress", "job": dict(_job)}

        job_id = str(uuid.uuid4())
        _job = {
            "job_id": job_id,
            "status": "running",
            "phase": "starting",
            "current": 0,
            "total": 0,
            "created": 0,
            "updated": 0,
            "message": "Starting faculty scrape…",
            "errors": [],
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": None,
        }

    thread = threading.Thread(target=_run, args=(job_id,), daemon=True)
    thread.start()
    return {"ok": True, "job_id": job_id}


def _sync_avatar(session, existing: Optional[models.TeacherProfile], row) -> Optional[str]:
    if not row.image_url or not row.profile_url:
        return existing.avatar_url if existing else None
    try:
        new_avatar = download_teacher_photo(session, row.image_url, row.profile_url)
    except Exception:
        return existing.avatar_url if existing else None
    if not new_avatar:
        return existing.avatar_url if existing else None
    if existing and existing.avatar_url and existing.avatar_url != new_avatar:
        delete_static_media(existing.avatar_url, TEACHERS_STATIC_PREFIX)
    return new_avatar


def _run(job_id: str) -> None:
    db = SessionLocal()
    try:
        import httpcloak

        from scrape.teacher_scrape import scrape_cse_faculty

        _set(phase="connecting", message="Connecting with browser fingerprint…")

        def on_progress(phase: str, current: int, total: int) -> None:
            _set(
                phase=phase,
                current=current,
                total=total,
                message=f"Scraping {phase} ({current}/{total})…",
            )

        with httpcloak.Session(preset="chrome-latest") as session:
            faculty = scrape_cse_faculty(session, on_progress=on_progress)

            created = 0
            updated = 0
            errors: list[str] = []

            _set(phase="database", total=len(faculty), current=0, message="Saving to database…")

            for i, row in enumerate(faculty, start=1):
                _set(current=i, message=f"Saving teachers ({i}/{len(faculty)})…")
                try:
                    existing = None
                    if row.profile_url:
                        existing = (
                            db.query(models.TeacherProfile)
                            .filter(models.TeacherProfile.profile_url == row.profile_url)
                            .first()
                        )
                    if not existing:
                        existing = (
                            db.query(models.TeacherProfile)
                            .filter(models.TeacherProfile.name == row.name)
                            .first()
                        )

                    department = normalize_department(row.department)
                    avatar_url = _sync_avatar(session, existing, row)

                    if existing:
                        existing.name = row.name
                        existing.designation = row.designation
                        existing.department = department
                        existing.email = row.email
                        existing.contact_number = row.contact_number
                        existing.room_no = row.room_no
                        if row.profile_url:
                            existing.profile_url = row.profile_url
                        if avatar_url:
                            existing.avatar_url = avatar_url
                        updated += 1
                    else:
                        db.add(
                            models.TeacherProfile(
                                name=row.name,
                                designation=row.designation,
                                department=department,
                                contact_number=row.contact_number,
                                email=row.email,
                                room_no=row.room_no,
                                profile_url=row.profile_url or None,
                                avatar_url=avatar_url,
                            )
                        )
                        created += 1
                except Exception as exc:
                    errors.append(f"{row.name}: {exc}")

        db.commit()
        _set(
            status="completed",
            phase="done",
            created=created,
            updated=updated,
            errors=errors[:20],
            message=f"Done — {created} added, {updated} updated.",
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
