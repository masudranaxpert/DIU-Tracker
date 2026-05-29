from typing import List

from sqlalchemy.orm import Session

import models, schemas


def get_groups(db: Session, batch_id: str, course_id: str, section: str):
    return (
        db.query(models.CourseGroup)
        .filter(
            models.CourseGroup.batch_id == batch_id,
            models.CourseGroup.course_id == course_id,
            models.CourseGroup.section == section,
        )
        .order_by(models.CourseGroup.sub_section, models.CourseGroup.group_number)
        .all()
    )


def update_groups(
    db: Session,
    batch_id: str,
    course_id: str,
    section: str,
    groups: List[schemas.CourseGroupCreate],
):
    db.query(models.CourseGroup).filter(
        models.CourseGroup.batch_id == batch_id,
        models.CourseGroup.course_id == course_id,
        models.CourseGroup.section == section,
    ).delete()
    db.commit()
    result = []
    for group_data in groups:
        db_group = models.CourseGroup(
            batch_id=batch_id,
            course_id=course_id,
            section=section,
            sub_section=group_data.sub_section,
            group_number=group_data.group_number,
        )
        db.add(db_group)
        db.flush()
        for member in group_data.members:
            db_member = models.GroupMember(
                group_id=db_group.id,
                student_id=member.student_id,
                name=member.name,
            )
            db.add(db_member)
        result.append(db_group)
    db.commit()
    for g in result:
        db.refresh(g)
    return get_groups(db, batch_id, course_id, section)
