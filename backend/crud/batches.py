from sqlalchemy.orm import Session

import models, schemas


def get_batches(db: Session):
    return db.query(models.Batch).order_by(models.Batch.name).all()


def get_batch(db: Session, batch_id: str):
    return db.query(models.Batch).filter(models.Batch.id == batch_id).first()


def create_batch(db: Session, batch: schemas.BatchCreate):
    db_batch = models.Batch(name=batch.name)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch
