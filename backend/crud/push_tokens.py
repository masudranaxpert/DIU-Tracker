from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas


def upsert_push_token(db: Session, payload: schemas.PushTokenRegister) -> models.DevicePushToken:
    row = (
        db.query(models.DevicePushToken)
        .filter(models.DevicePushToken.fcm_token == payload.fcm_token)
        .first()
    )
    if row:
        row.batch_id = payload.batch_id
        row.section = payload.section
        row.sub_section = payload.sub_section
        row.user_id = payload.user_id
        row.platform = payload.platform or row.platform
    else:
        row = models.DevicePushToken(
            fcm_token=payload.fcm_token,
            batch_id=payload.batch_id,
            section=payload.section,
            sub_section=payload.sub_section,
            user_id=payload.user_id,
            platform=payload.platform or "android",
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


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
