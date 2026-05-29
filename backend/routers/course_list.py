from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from routers.admin_auth import get_current_admin
import crud, schemas

router = APIRouter(prefix="/course-list", tags=["course-list"])


@router.get("", response_model=List[schemas.CourseListResponse])
def read_course_list(
    q: Optional[str] = Query(None, description="Search code or name"),
    db: Session = Depends(get_db),
):
    """Public catalog for CR course registration dropdown."""
    return crud.get_course_list_items(db, q=q)
