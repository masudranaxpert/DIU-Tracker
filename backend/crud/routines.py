from sqlalchemy.orm import Session
import models, schemas

def get_routines(db: Session, batch_id: str, section: str):
    return (
        db.query(models.Routine)
        .filter(models.Routine.batch_id == batch_id)
        .filter(models.Routine.section == section)
        .all()
    )

def save_routine(db: Session, batch_id: str, section: str, classes: list[schemas.RoutineItemBase]):
    db.query(models.Routine).filter(
        models.Routine.batch_id == batch_id,
        models.Routine.section == section
    ).delete(synchronize_session=False)
    
    db_routines = []
    for cls in classes:
        db_routine = models.Routine(
            batch_id=batch_id,
            section=section,
            **cls.model_dump()
        )
        db.add(db_routine)
        db_routines.append(db_routine)
        
    db.commit()
    for db_routine in db_routines:
        db.refresh(db_routine)
    return db_routines

def delete_routine(db: Session, batch_id: str, section: str):
    db.query(models.Routine).filter(
        models.Routine.batch_id == batch_id,
        models.Routine.section == section
    ).delete(synchronize_session=False)
    db.commit()
    return True
