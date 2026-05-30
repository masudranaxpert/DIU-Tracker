from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from auth.setup import User, current_user_optional
from database import get_db
import crud, schemas

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/register", status_code=status.HTTP_204_NO_CONTENT)
def register_push_token(
    body: schemas.PushTokenRegister,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(current_user_optional),
):
    if user and not body.user_id:
        body = body.model_copy(update={"user_id": user.id})
    crud.upsert_push_token(db, body)


@router.post("/unregister", status_code=status.HTTP_204_NO_CONTENT)
def unregister_push_token(
    body: schemas.PushTokenUnregister,
    db: Session = Depends(get_db),
):
    crud.delete_push_token(db, body.fcm_token)
