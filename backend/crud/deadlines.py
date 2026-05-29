from sqlalchemy.orm import Session

import models, schemas


def get_deadlines(db: Session, batch_id: str):
    return (
        db.query(models.Deadline)
        .filter(models.Deadline.batch_id == batch_id)
        .order_by(models.Deadline.date.asc())
        .all()
    )


def create_deadline(db: Session, deadline: schemas.DeadlineCreate):
    db_deadline = models.Deadline(**deadline.model_dump())
    db.add(db_deadline)
    db.commit()
    db.refresh(db_deadline)
    return db_deadline


def update_deadline(db: Session, deadline_id: str, updates: schemas.DeadlineUpdate):
    db_deadline = db.query(models.Deadline).filter(models.Deadline.id == deadline_id).first()
    if not db_deadline:
        return None
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(db_deadline, key, value)
    db.commit()
    db.refresh(db_deadline)
    return db_deadline


def delete_deadline(db: Session, deadline_id: str):
    db_deadline = db.query(models.Deadline).filter(models.Deadline.id == deadline_id).first()
    if not db_deadline:
        return False
    db.delete(db_deadline)
    db.commit()
    return True
