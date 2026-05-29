"""24-hour cache for DIUQBank question PDF submission links.

- View click: return fresh cache immediately, or start a background scrape.
- Expired rows: removed by a daily purge (not on every request).
"""
from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy.orm import Session

from database import SessionLocal
import models

BASE_URL = "https://diuqbank.com"
CACHE_TTL = timedelta(hours=24)
PURGE_INTERVAL_SECONDS = 24 * 60 * 60

_lock = threading.Lock()
_refreshing: set[int] = set()
_refresh_errors: dict[int, str] = {}


def _utcnow() -> datetime:
    return datetime.utcnow()


def _fresh_cutoff() -> datetime:
    return _utcnow() - CACHE_TTL


def get_cached_submissions(db: Session, question_id: int) -> list[dict[str, Any]]:
    cutoff = _fresh_cutoff()
    rows = (
        db.query(models.QbSubmissionCache)
        .filter(
            models.QbSubmissionCache.question_external_id == question_id,
            models.QbSubmissionCache.cached_at >= cutoff,
        )
        .order_by(models.QbSubmissionCache.submission_external_id.asc())
        .all()
    )
    return [
        {
            "id": row.submission_external_id,
            "pdf_url": row.pdf_url,
            "section": row.section,
            "uploader": row.uploader,
        }
        for row in rows
        if row.pdf_url
    ]


def delete_question_cache(db: Session, question_id: int) -> None:
    db.query(models.QbSubmissionCache).filter(
        models.QbSubmissionCache.question_external_id == question_id
    ).delete(synchronize_session=False)
    db.commit()


def save_submissions_cache(db: Session, question_id: int, submissions: list[dict[str, Any]]) -> None:
    delete_question_cache(db, question_id)
    now = _utcnow()
    for sub in submissions:
        pdf_url = (sub.get("pdf_url") or "").strip()
        if not pdf_url:
            continue
        db.add(
            models.QbSubmissionCache(
                question_external_id=question_id,
                submission_external_id=int(sub["id"]),
                pdf_url=pdf_url,
                section=sub.get("section"),
                uploader=sub.get("uploader"),
                cached_at=now,
            )
        )
    db.commit()


def purge_expired_submissions() -> int:
    """Delete all cache rows older than 24 hours. Run once per day."""
    cutoff = _fresh_cutoff()
    db = SessionLocal()
    try:
        deleted = (
            db.query(models.QbSubmissionCache)
            .filter(models.QbSubmissionCache.cached_at < cutoff)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted
    finally:
        db.close()


def is_refresh_running(question_id: int) -> bool:
    with _lock:
        return question_id in _refreshing


def get_refresh_error(question_id: int) -> Optional[str]:
    with _lock:
        return _refresh_errors.get(question_id)


def _scrape_submissions(question_id: int) -> list[dict[str, Any]]:
    import httpcloak

    from scrape.qbank_scrape import scrape_question_show

    url = f"{BASE_URL}/questions/{question_id}"
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

    return [
        {
            "id": s.id,
            "pdf_url": s.pdf_url,
            "section": s.section,
            "uploader": (s.user or {}).get("name") if s.user else None,
        }
        for s in submissions
        if s.pdf_url
    ]


def _run_refresh(question_id: int) -> None:
    global _refreshing, _refresh_errors
    try:
        items = _scrape_submissions(question_id)
        db = SessionLocal()
        try:
            save_submissions_cache(db, question_id, items)
        finally:
            db.close()
        with _lock:
            _refresh_errors.pop(question_id, None)
    except Exception as exc:  # noqa: BLE001
        with _lock:
            _refresh_errors[question_id] = str(exc)
    finally:
        with _lock:
            _refreshing.discard(question_id)


def start_refresh_job(question_id: int, *, force: bool = False) -> bool:
    """Start background scrape if not already running. Returns True if started."""
    with _lock:
        if question_id in _refreshing:
            return False
        if not force:
            _refresh_errors.pop(question_id, None)
        _refreshing.add(question_id)

    thread = threading.Thread(target=_run_refresh, args=(question_id,), daemon=True)
    thread.start()
    return True


def start_daily_purge_loop() -> None:
    """Daemon thread: purge expired cache rows once per day."""

    def _loop() -> None:
        while True:
            try:
                removed = purge_expired_submissions()
                if removed:
                    print(f"[qbank-cache] Purged {removed} expired submission cache row(s)")
            except Exception as exc:  # noqa: BLE001
                print(f"[qbank-cache] Purge failed: {exc}")
            time.sleep(PURGE_INTERVAL_SECONDS)

    thread = threading.Thread(target=_loop, name="qbank-cache-purge", daemon=True)
    thread.start()


def purge_on_startup() -> None:
    try:
        removed = purge_expired_submissions()
        if removed:
            print(f"[qbank-cache] Startup purge removed {removed} expired row(s)")
    except Exception as exc:  # noqa: BLE001
        print(f"[qbank-cache] Startup purge failed: {exc}")
