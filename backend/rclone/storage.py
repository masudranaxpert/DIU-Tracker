"""Multiple Google Drive accounts — DB + token/quota sync."""
import json
import time
from datetime import datetime, timedelta
from typing import Any, Optional

QUOTA_CACHE_TTL_SEC = 300  # 5 minutes

from sqlalchemy.orm import Session

import models
from rclone.oauth import (
    bytes_to_gb,
    fetch_drive_quota,
    fetch_google_account_email,
    refresh_access_token,
)


def _load_token(row: models.RcloneDriveAccount) -> dict | None:
    if not row.token_json:
        return None
    try:
        return json.loads(row.token_json)
    except json.JSONDecodeError:
        return None


def _save_token(row: models.RcloneDriveAccount, token_data: dict[str, Any], email: Optional[str] = None):
    merged = {**(_load_token(row) or {}), **token_data}
    if email:
        merged["authorized_email"] = email
    merged["saved_at"] = datetime.utcnow().isoformat()
    row.token_json = json.dumps(merged)
    if email:
        row.authorized_email = email
    row.token_updated_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()


def account_to_response(row: models.RcloneDriveAccount) -> dict:
    token = _load_token(row)
    limit_b = row.storage_limit_bytes
    usage_b = row.storage_usage_bytes
    free_gb = None
    if limit_b is not None and usage_b is not None:
        free_gb = bytes_to_gb(max(0, limit_b - usage_b))
    return {
        "id": row.id,
        "label": row.label,
        "client_id": row.client_id,
        "redirect_uri": row.redirect_uri,
        "authorized_email": row.authorized_email,
        "is_active": row.is_active,
        "token_status": row.token_status,
        "has_refresh_token": bool(token and token.get("refresh_token")),
        "is_authorized": bool(token and token.get("refresh_token")),
        "storage_total_gb": bytes_to_gb(limit_b),
        "storage_used_gb": bytes_to_gb(usage_b),
        "storage_free_gb": free_gb,
        "quota_checked_at": row.quota_checked_at,
        "token_updated_at": row.token_updated_at,
        "created_at": row.created_at,
        "last_error": row.last_error,
    }


def list_accounts(db: Session) -> list[models.RcloneDriveAccount]:
    return (
        db.query(models.RcloneDriveAccount)
        .order_by(models.RcloneDriveAccount.created_at.desc())
        .all()
    )


def get_account(db: Session, account_id: str) -> models.RcloneDriveAccount | None:
    return db.query(models.RcloneDriveAccount).filter(models.RcloneDriveAccount.id == account_id).first()


def create_pending_account(
    db: Session,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    label: Optional[str] = None,
) -> models.RcloneDriveAccount:
    row = models.RcloneDriveAccount(
        client_id=client_id.strip(),
        client_secret=client_secret.strip(),
        redirect_uri=(redirect_uri or "http://localhost").strip(),
        label=(label or "").strip() or None,
        token_status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def complete_authorization(
    db: Session,
    account_id: str,
    token_response: dict[str, Any],
) -> models.RcloneDriveAccount:
    row = get_account(db, account_id)
    if not row:
        raise ValueError("Account not found")

    email = token_response.get("authorized_email")
    if not email and token_response.get("access_token"):
        email = fetch_google_account_email(token_response["access_token"])

    expires_in = int(token_response.get("expires_in", 3600))
    token_response["expires_at"] = int(time.time()) + expires_in - 60

    _save_token(row, token_response, email)
    row.label = row.label or email
    row.token_status = "connected"
    row.last_error = None
    db.commit()
    db.refresh(row)

    try:
        sync_account_status(db, account_id)
        db.refresh(row)
    except ValueError as exc:
        row.last_error = str(exc)
        db.commit()
        db.refresh(row)
    return row


def get_access_token(db: Session, row: models.RcloneDriveAccount) -> str:
    token = _load_token(row)
    if not token:
        raise ValueError("Not authorized")

    if token.get("access_token") and token.get("expires_at", 0) > time.time():
        return token["access_token"]

    refresh = token.get("refresh_token")
    if not refresh:
        row.token_status = "expired"
        row.last_error = "No refresh token — re-setup required"
        db.commit()
        raise ValueError(row.last_error)

    try:
        refreshed = refresh_access_token(row.client_id, row.client_secret, refresh)
    except ValueError as exc:
        row.token_status = "expired"
        row.last_error = str(exc)
        db.commit()
        raise

    expires_in = int(refreshed.get("expires_in", 3600))
    refreshed["expires_at"] = int(time.time()) + expires_in - 60
    if "refresh_token" not in refreshed and refresh:
        refreshed["refresh_token"] = refresh
    _save_token(row, refreshed)
    row.token_status = "connected"
    row.last_error = None
    db.commit()
    return refreshed["access_token"]


def _quota_cache_fresh(row: models.RcloneDriveAccount) -> bool:
    if not row.quota_checked_at:
        return False
    return (datetime.utcnow() - row.quota_checked_at) < timedelta(seconds=QUOTA_CACHE_TTL_SEC)


def sync_account_status(
    db: Session, account_id: str, *, force_quota: bool = False
) -> models.RcloneDriveAccount:
    row = get_account(db, account_id)
    if not row:
        raise ValueError("Account not found")

    token = _load_token(row)
    if not token or not token.get("refresh_token"):
        row.token_status = "pending" if not token else "expired"
        db.commit()
        db.refresh(row)
        return row

    try:
        access = get_access_token(db, row)
        row.token_status = "connected"
        row.is_active = True
        if force_quota or not _quota_cache_fresh(row):
            try:
                quota = fetch_drive_quota(access)
                row.storage_limit_bytes = quota.get("limit_bytes")
                row.storage_usage_bytes = quota.get("usage_bytes") or 0
                if quota.get("user_email"):
                    row.authorized_email = quota["user_email"]
                row.quota_checked_at = datetime.utcnow()
                row.last_error = None
            except ValueError as quota_exc:
                # Token works; quota endpoint may be blocked — uploads can still work.
                row.last_error = str(quota_exc) if force_quota else row.last_error
        else:
            row.last_error = None
    except ValueError as exc:
        row.last_error = str(exc)
        if "invalid_grant" in str(exc).lower() or "expired" in str(exc).lower():
            row.token_status = "expired"
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def delete_account(db: Session, account_id: str) -> bool:
    row = get_account(db, account_id)
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def patch_account(
    db: Session,
    account_id: str,
    is_active: Optional[bool] = None,
    label: Optional[str] = None,
) -> models.RcloneDriveAccount | None:
    row = get_account(db, account_id)
    if not row:
        return None
    if is_active is not None:
        row.is_active = is_active
    if label is not None:
        row.label = label.strip() or None
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def list_ready_active_accounts(db: Session) -> list[models.RcloneDriveAccount]:
    rows = (
        db.query(models.RcloneDriveAccount)
        .filter(
            models.RcloneDriveAccount.is_active.is_(True),
            models.RcloneDriveAccount.token_status == "connected",
            models.RcloneDriveAccount.token_json.isnot(None),
        )
        .order_by(models.RcloneDriveAccount.updated_at.desc())
        .all()
    )
    ready: list[models.RcloneDriveAccount] = []
    for row in rows:
        token = _load_token(row)
        if token and token.get("refresh_token"):
            ready.append(row)
    return ready


def pick_upload_account(db: Session) -> models.RcloneDriveAccount:
    return pick_upload_account_for_size(db, 0)


def pick_upload_account_for_size(db: Session, file_size_bytes: int) -> models.RcloneDriveAccount:
    accounts = list_ready_active_accounts(db)
    if not accounts:
        raise ValueError(
            "No active Google Drive account. Ask your super admin to set up Rclone in the admin panel."
        )

    candidates: list[tuple[int, models.RcloneDriveAccount]] = []
    for row in accounts:
        limit_b = row.storage_limit_bytes
        usage_b = row.storage_usage_bytes or 0
        if limit_b is not None and usage_b + file_size_bytes > limit_b:
            continue
        free = (limit_b - usage_b) if limit_b is not None else 10**18
        candidates.append((free, row))

    if not candidates:
        # Cached quota says full, or quota unknown — still try first connected account.
        return accounts[0]

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def delete_drive_file_for_attachment(
    db: Session,
    drive_file_id: Optional[str],
    rclone_account_id: Optional[str],
    file_url: Optional[str] = None,
) -> bool:
    """
    Delete from Google Drive using the upload account first, then every other ready account.
    Returns True if deleted or already absent; False if nothing could be attempted; raises on hard errors.
    """
    from rclone.drive_files import (
        delete_drive_file_with_retry,
        extract_drive_file_id,
        friendly_drive_error,
    )

    if file_url and "t.me/" in file_url.lower():
        return True

    fid = extract_drive_file_id(drive_file_id) or extract_drive_file_id(file_url)
    if not fid:
        return True

    account_ids: list[str] = []
    if rclone_account_id:
        account_ids.append(rclone_account_id)
    for row in list_ready_active_accounts(db):
        if row.id not in account_ids:
            account_ids.append(row.id)

    if not account_ids:
        raise ValueError("No active Google Drive accounts configured.")

    last_error: Optional[ValueError] = None
    saw_not_found = False

    for aid in account_ids:
        row = get_account(db, aid)
        if not row:
            continue
        try:
            access = get_access_token(db, row)
            status = delete_drive_file_with_retry(access, fid)
            if status == "deleted":
                return True
            saw_not_found = True
        except ValueError as exc:
            last_error = exc
            continue

    if saw_not_found and last_error is None:
        return True

    if last_error:
        raise ValueError(friendly_drive_error(str(last_error))) from last_error

    return False


def prune_duplicate_accounts(db: Session) -> tuple[int, list[models.RcloneDriveAccount]]:
    rows = list_accounts(db)
    groups: dict[str, list[models.RcloneDriveAccount]] = {}
    for row in rows:
        key = (row.authorized_email or row.client_id or row.id).lower()
        groups.setdefault(key, []).append(row)

    def rank(r: models.RcloneDriveAccount) -> tuple:
        return (
            1 if r.token_status == "connected" else 0,
            1 if r.is_active else 0,
            r.quota_checked_at or datetime.min,
            r.updated_at or datetime.min,
        )

    removed = 0
    for group in groups.values():
        if len(group) < 2:
            continue
        group.sort(key=rank, reverse=True)
        for dup in group[1:]:
            db.delete(dup)
            removed += 1
    if removed:
        db.commit()
    return removed, list_accounts(db)


def reset_for_reauth(db: Session, account_id: str) -> models.RcloneDriveAccount:
    row = get_account(db, account_id)
    if not row:
        raise ValueError("Account not found")
    row.token_json = None
    row.authorized_email = None
    row.token_status = "pending"
    row.storage_limit_bytes = None
    row.storage_usage_bytes = None
    row.quota_checked_at = None
    row.last_error = None
    row.token_updated_at = None
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row
