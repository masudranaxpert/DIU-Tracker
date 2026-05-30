"""Push for in-app bell sources: notices, records, deadlines."""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy.orm import Session

import crud
from services import fcm

_logger = logging.getLogger(__name__)


def _send(
    db: Session,
    *,
    batch_id: str,
    section: Optional[str],
    title: str,
    body: str,
    data: dict[str, Any],
    exclude_user_id: Optional[str] = None,
    high_priority: bool = False,
) -> int:
    tokens = crud.get_push_tokens_for_audience(
        db,
        batch_id=batch_id,
        section=section,
        exclude_user_id=exclude_user_id,
    )
    if not tokens:
        _logger.info("No FCM tokens for batch=%s section=%s", batch_id, section)
        return 0

    sent, invalid = fcm.send_push(
        tokens,
        title=title,
        body=body,
        data=data,
        high_priority=high_priority,
    )
    if invalid:
        removed = crud.delete_push_tokens_bulk(db, invalid)
        _logger.info("Removed %s stale FCM tokens", removed)

    _logger.info(
        "FCM delivered %s/%s (batch=%s section=%s)",
        sent,
        len(tokens),
        batch_id,
        section,
    )
    return sent


def notify_new_notice(db: Session, notice) -> int:
    body = (notice.content or "New Announcement published.").strip()
    urgent = notice.priority in ("urgent", "high")
    return _send(
        db,
        batch_id=notice.batch_id,
        section=notice.section,
        title=notice.title,
        body=body,
        data={
            "kind": "notice",
            "item_id": notice.id,
            "record_type": "Announcement",
        },
        exclude_user_id=notice.created_by,
        high_priority=urgent,
    )


def notify_new_record(db: Session, record) -> int:
    body = (record.description or f"New {record.type} published.").strip()
    urgent = record.type in ("CT", "MID")
    return _send(
        db,
        batch_id=record.batch_id,
        section=record.section,
        title=record.title,
        body=body,
        data={
            "kind": "record",
            "item_id": record.id,
            "course_id": record.course_id or "",
            "record_type": record.type or "",
        },
        exclude_user_id=record.created_by,
        high_priority=urgent,
    )


def notify_new_deadline(db: Session, deadline) -> int:
    body = (deadline.description or "New Deadline added.").strip()
    return _send(
        db,
        batch_id=deadline.batch_id,
        section=None,
        title=deadline.title,
        body=body,
        data={
            "kind": "deadline",
            "item_id": deadline.id,
            "course_id": deadline.course_id or "",
            "record_type": deadline.type or "Deadline",
        },
        exclude_user_id=deadline.created_by,
        high_priority=False,
    )
