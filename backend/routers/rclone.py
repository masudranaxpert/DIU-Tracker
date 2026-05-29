"""Super-admin Google Drive (Rclone) — multiple accounts."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from routers.admin_auth import get_current_admin
from rclone import schemas as s
from rclone.oauth import DRIVE_SCOPE, build_authorization_url, exchange_authorization_code, extract_code_from_redirect
from rclone.storage import (
    account_to_response,
    complete_authorization,
    create_pending_account,
    delete_account,
    get_account,
    list_accounts,
    patch_account,
    prune_duplicate_accounts,
    reset_for_reauth,
    sync_account_status,
)

router = APIRouter(prefix="/admin/portal/rclone", tags=["rclone"])


@router.get("/accounts", response_model=s.RcloneAccountListResponse)
def list_drive_accounts(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
    refresh: bool = Query(False),
    force: bool = Query(False),
):
    rows = list_accounts(db)
    if refresh:
        for row in rows:
            if row.token_status == "connected" and row.is_active:
                try:
                    sync_account_status(db, row.id, force_quota=force)
                except ValueError:
                    pass
        rows = list_accounts(db)
    return s.RcloneAccountListResponse(
        items=[s.RcloneAccountResponse(**account_to_response(r)) for r in rows],
        total=len(rows),
    )


@router.post("/accounts/prune-duplicates")
def prune_accounts(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    removed, rows = prune_duplicate_accounts(db)
    return {
        "removed": removed,
        "remaining": len(rows),
        "items": [s.RcloneAccountResponse(**account_to_response(r)) for r in rows],
    }


@router.post("/accounts/auth-url", response_model=s.RcloneAuthUrlResponse)
def start_account_setup(
    body: s.RcloneAccountCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    row = create_pending_account(
        db, body.client_id, body.client_secret, body.redirect_uri, body.label
    )
    redirect_uri = row.redirect_uri or "http://localhost"
    return s.RcloneAuthUrlResponse(
        account_id=row.id,
        authorization_url=build_authorization_url(row.client_id, redirect_uri, state=row.id),
        redirect_uri=redirect_uri,
        scope=DRIVE_SCOPE,
    )


@router.get("/accounts/{account_id}/auth-url", response_model=s.RcloneAuthUrlResponse)
def reauth_account_url(
    account_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    row = get_account(db, account_id)
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    reset_for_reauth(db, account_id)
    row = get_account(db, account_id)
    redirect_uri = row.redirect_uri or "http://localhost"
    return s.RcloneAuthUrlResponse(
        account_id=row.id,
        authorization_url=build_authorization_url(row.client_id, redirect_uri, state=row.id),
        redirect_uri=redirect_uri,
        scope=DRIVE_SCOPE,
    )


@router.post("/accounts/{account_id}/authorize", response_model=s.RcloneAuthorizeResponse)
def finish_account_setup(
    account_id: str,
    body: s.RcloneAuthorizeRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    row = get_account(db, account_id)
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        code = extract_code_from_redirect(body.redirect_url)
        token_data = exchange_authorization_code(
            row.client_id, row.client_secret, row.redirect_uri, code
        )
        updated = complete_authorization(db, account_id, token_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return s.RcloneAuthorizeResponse(
        success=True,
        message="Google Drive connected. Tokens saved in database.",
        account=s.RcloneAccountResponse(**account_to_response(updated)),
    )


@router.post("/accounts/{account_id}/refresh", response_model=s.RcloneAccountResponse)
def refresh_account(
    account_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    try:
        row = sync_account_status(db, account_id, force_quota=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return s.RcloneAccountResponse(**account_to_response(row))


@router.patch("/accounts/{account_id}", response_model=s.RcloneAccountResponse)
def update_account(
    account_id: str,
    body: s.RcloneAccountPatch,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    row = patch_account(db, account_id, body.is_active, body.label)
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    return s.RcloneAccountResponse(**account_to_response(row))


@router.delete("/accounts/{account_id}")
def remove_account(
    account_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    if not delete_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted"}
