from datetime import datetime
from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

import models
import schemas
from models import generate_uuid

_MAX_UPSERT_RETRIES = 3


def upsert_push_token(db: Session, payload: schemas.PushTokenRegister) -> models.DevicePushToken:
    """Atomic upsert on fcm_token (avoids MariaDB 1020 concurrent update errors)."""
    now = datetime.utcnow()
    platform = payload.platform or "android"

    for attempt in range(_MAX_UPSERT_RETRIES):
        try:
            stmt = mysql_insert(models.DevicePushToken).values(
                id=generate_uuid(),
                fcm_token=payload.fcm_token,
                batch_id=payload.batch_id,
                section=payload.section,
                sub_section=payload.sub_section,
                user_id=payload.user_id,
                platform=platform,
                created_at=now,
                updated_at=now,
            )
            stmt = stmt.on_duplicate_key_update(
                batch_id=stmt.inserted.batch_id,
                section=stmt.inserted.section,
                sub_section=stmt.inserted.sub_section,
                user_id=stmt.inserted.user_id,
                platform=stmt.inserted.platform,
                updated_at=now,
            )
            db.execute(stmt)
            db.commit()
            row = (
                db.query(models.DevicePushToken)
                .filter(models.DevicePushToken.fcm_token == payload.fcm_token)
                .one()
            )
            return row
        except OperationalError:
            db.rollback()
            if attempt >= _MAX_UPSERT_RETRIES - 1:
                raise

    raise RuntimeError("push token upsert failed")


def delete_push_tokens_bulk(db: Session, fcm_tokens: list[str]) -> int:
    if not fcm_tokens:
        return 0
    deleted = (
        db.query(models.DevicePushToken)
        .filter(models.DevicePushToken.fcm_token.in_(fcm_tokens))
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted


def delete_push_token(db: Session, fcm_token: str) -> bool:
    row = (
        db.query(models.DevicePushToken)
        .filter(models.DevicePushToken.fcm_token == fcm_token)
        .first()
    )
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def get_push_tokens_for_audience(
    db: Session,
    *,
    batch_id: str,
    section: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
) -> List[str]:
    """Tokens for batch; when section is set, include section-specific and batch-wide (null section) tokens."""
    q = db.query(models.DevicePushToken).filter(models.DevicePushToken.batch_id == batch_id)
    if section:
        q = q.filter(
            or_(
                models.DevicePushToken.section == section,
                models.DevicePushToken.section.is_(None),
            )
        )
    if exclude_user_id:
        q = q.filter(
            or_(
                models.DevicePushToken.user_id.is_(None),
                models.DevicePushToken.user_id != exclude_user_id,
            )
        )
    return [r.fcm_token for r in q.all() if r.fcm_token]
