"""Shared CRUD helpers."""
from typing import List, Optional

from sqlalchemy.orm import Session

import models


def norm_section(section: Optional[str]) -> Optional[str]:
    if section is None:
        return None
    return str(section).strip().upper()


def cr_names_for_section(db: Session, batch_id: Optional[str], section: Optional[str]) -> List[str]:
    if not batch_id or not section:
        return []
    sk = norm_section(section)
    users = (
        db.query(models.User)
        .filter(
            models.User.is_cr == True,
            models.User.is_active == True,
            models.User.batch_id == batch_id,
            models.User.section == sk,
        )
        .all()
    )
    return [u.full_name or u.email or "CR" for u in users]


def normalize_section_pin(pin: Optional[str]) -> Optional[str]:
    if pin is None or not str(pin).strip():
        return None
    pin_value = str(pin).strip()
    if len(pin_value) != 4 or not pin_value.isdigit():
        raise ValueError("PIN must be exactly 4 digits")
    return pin_value
