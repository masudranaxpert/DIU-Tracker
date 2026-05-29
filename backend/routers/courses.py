from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import crud, schemas

router = APIRouter(
    tags=["courses & groups"]
)

# --- Course Endpoints ---
@router.get("/courses", response_model=List[schemas.CourseResponse])
def read_courses(
    batch_id: Optional[str] = None, 
    section: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    return crud.get_courses(db, batch_id=batch_id, section=section)

@router.post("/courses", response_model=schemas.CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    return crud.create_course(db, course)

@router.put("/courses/{course_id}", response_model=schemas.CourseResponse)
def update_course(course_id: str, updates: schemas.CourseUpdate, db: Session = Depends(get_db)):
    db_course = crud.update_course(db, course_id, updates)
    if db_course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course

@router.delete("/courses/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db)):
    success = crud.delete_course(db, course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted successfully"}


# --- Group Endpoints ---
@router.get("/groups", response_model=List[schemas.CourseGroupResponse])
def read_groups(batch_id: str, course_id: str, section: str, db: Session = Depends(get_db)):
    return crud.get_groups(db, batch_id, course_id, section)

@router.post("/groups/upsert", response_model=List[schemas.CourseGroupResponse])
def upsert_groups(
    batch_id: str, 
    course_id: str, 
    section: str, 
    groups: List[schemas.CourseGroupCreate], 
    db: Session = Depends(get_db)
):
    return crud.update_groups(db, batch_id, course_id, section, groups)
