from sqlalchemy.orm import Session

import models, schemas


def get_feedbacks(db: Session, batch_id: str, section: str):
    return (
        db.query(models.Feedback)
        .filter(
            models.Feedback.batch_id == batch_id,
            models.Feedback.section == section,
        )
        .order_by(models.Feedback.created_at.desc())
        .all()
    )


def create_feedback(db: Session, feedback: schemas.FeedbackCreate):
    db_feedback = models.Feedback(**feedback.model_dump())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback
