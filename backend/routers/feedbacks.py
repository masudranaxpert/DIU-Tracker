from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth.setup import fastapi_users
from models import User
import crud, schemas

router = APIRouter(prefix="/feedbacks", tags=["feedbacks"])

current_authenticated_user = fastapi_users.current_user(active=False, verified=False)


def _require_active_cr(user: User, batch_id: str, section: str) -> None:
    if not user.is_cr or not user.is_active:
        raise HTTPException(status_code=403, detail="Only active CRs can submit feedback")
    if user.batch_id != batch_id:
        raise HTTPException(status_code=403, detail="Feedback must be for your batch")
    if str(user.section).strip().upper() != str(section).strip().upper():
        raise HTTPException(status_code=403, detail="Feedback must be for your section")


@router.post("", response_model=schemas.FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    feedback: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_authenticated_user),
):
    _require_active_cr(user, feedback.batch_id, feedback.section)
    return crud.create_feedback(db, feedback)


@router.get("", response_model=list[schemas.FeedbackResponse])
def read_feedbacks(
    batch_id: str,
    section: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_authenticated_user),
):
    """Listing is restricted — use super-admin portal instead."""
    raise HTTPException(
        status_code=403,
        detail="Feedback list is not available. Only super admins can view submissions.",
    )
