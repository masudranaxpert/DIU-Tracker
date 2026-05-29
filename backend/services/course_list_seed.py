"""Seed / upsert global course catalog from course_list_content.py."""
import uuid
from datetime import datetime

from sqlalchemy import text

from course_list_content import CATALOG_DEFAULT_CREDIT, CSE_COURSE_LIST


def seed_course_list(connection) -> None:
    """Insert CSE courses if missing (matched by code). Safe to run every startup."""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    credit = CATALOG_DEFAULT_CREDIT
    for code, name in CSE_COURSE_LIST:
        existing = connection.execute(
            text("SELECT id FROM course_list WHERE code = :code"),
            {"code": code},
        ).fetchone()
        if existing:
            connection.execute(
                text(
                    "UPDATE course_list SET name = :name, default_credit = :credit "
                    "WHERE code = :code"
                ),
                {"name": name, "credit": credit, "code": code},
            )
        else:
            connection.execute(
                text(
                    "INSERT INTO course_list (id, code, name, default_credit, created_at) "
                    "VALUES (:id, :code, :name, :credit, :created_at)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "code": code,
                    "name": name,
                    "credit": credit,
                    "created_at": now,
                },
            )
