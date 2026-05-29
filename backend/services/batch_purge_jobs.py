"""In-memory background jobs for batch purge with progress."""
from __future__ import annotations

import threading
import time
import uuid
from datetime import datetime
from typing import Any, Optional

from database import SessionLocal
from crud import batch_admin
from rclone.storage import delete_drive_file_for_attachment

_jobs: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()


def _set(job_id: str, **kwargs: Any) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def start_batch_purge_job(batch_id: str, batch_name: str, include_drive: bool) -> str:
    job_id = str(uuid.uuid4())
    with _lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "batch_id": batch_id,
            "batch_name": batch_name,
            "include_drive": include_drive,
            "status": "queued",
            "phase": "starting",
            "current": 0,
            "total": 0,
            "drive_deleted": 0,
            "drive_skipped": 0,
            "drive_failed": 0,
            "db_stats": None,
            "message": "Starting…",
            "errors": [],
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": None,
        }

    thread = threading.Thread(
        target=_run_job,
        args=(job_id, batch_id, include_drive),
        daemon=True,
    )
    thread.start()
    return job_id


def _run_job(job_id: str, batch_id: str, include_drive: bool) -> None:
    db = SessionLocal()
    try:
        _set(job_id, status="running")

        if include_drive:
            attachments = batch_admin.get_batch_drive_attachments(db, batch_id)
            total = len(attachments)
            _set(
                job_id,
                phase="drive",
                total=total,
                current=0,
                message=f"Deleting files from Google Drive (0/{total})…",
            )
            for i, att in enumerate(attachments, start=1):
                url = att.url or ""
                if "t.me/" in url.lower() and not att.public_id:
                    with _lock:
                        skipped = _jobs[job_id]["drive_skipped"] + 1
                    _set(
                        job_id,
                        current=i,
                        drive_skipped=skipped,
                        message=f"Skipping non-Drive file ({i}/{total})…",
                    )
                    time.sleep(0.05)
                    continue
                try:
                    delete_drive_file_for_attachment(
                        db,
                        att.public_id,
                        att.rclone_account_id,
                        att.url,
                    )
                    with _lock:
                        deleted = _jobs[job_id]["drive_deleted"] + 1
                    _set(job_id, drive_deleted=deleted)
                except Exception as exc:
                    with _lock:
                        failed = _jobs[job_id]["drive_failed"] + 1
                        errs = list(_jobs[job_id]["errors"])
                        if len(errs) < 20:
                            errs.append(str(exc)[:200])
                    _set(job_id, drive_failed=failed, errors=errs)
                _set(
                    job_id,
                    current=i,
                    message=f"Google Drive cleanup ({i}/{total})…",
                )
                time.sleep(0.35)

        _set(
            job_id,
            phase="database",
            message="Removing batch data from database…",
            current=0,
            total=1,
        )
        stats = batch_admin.purge_batch_database(db, batch_id)
        _set(
            job_id,
            status="completed",
            phase="done",
            current=1,
            total=1,
            db_stats=stats,
            message="Batch content cleared successfully.",
            finished_at=datetime.utcnow().isoformat(),
        )
    except Exception as exc:
        db.rollback()
        _set(
            job_id,
            status="failed",
            phase="error",
            message=str(exc)[:300],
            finished_at=datetime.utcnow().isoformat(),
        )
        with _lock:
            if job_id in _jobs:
                errs = list(_jobs[job_id]["errors"])
                errs.append(str(exc)[:300])
                _jobs[job_id]["errors"] = errs
    finally:
        db.close()
