import os
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./diu_tracker.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")


def _to_async_url(url: str) -> str:
    """Map a sync SQLAlchemy URL to its async driver equivalent."""
    if url.startswith("sqlite"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///")
    if url.startswith("mysql+pymysql"):
        return url.replace("mysql+pymysql", "mysql+aiomysql", 1)
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+aiomysql://", 1)
    return url


ASYNC_DATABASE_URL = _to_async_url(DATABASE_URL)

# Pooling matters for a real DB server (MariaDB); SQLite ignores these.
_pool_kwargs = {} if IS_SQLITE else {"pool_pre_ping": True, "pool_recycle": 3600}

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    **_pool_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    connect_args={"check_same_thread": False} if ASYNC_DATABASE_URL.startswith("sqlite") else {},
    **_pool_kwargs,
)
async_session_maker = async_sessionmaker(async_engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_session():
    async with async_session_maker() as session:
        yield session


def _run_sqlite_migrations(connection):
    """Lightweight migrations for existing SQLite DBs."""
    rows = connection.execute(text("PRAGMA table_info(students)")).fetchall()
    col_names = {row[1] for row in rows}
    if "section_pin" not in col_names:
        connection.execute(text("ALTER TABLE students ADD COLUMN section_pin VARCHAR"))

    tables = {
        r[0]
        for r in connection.execute(
            text("SELECT name FROM sqlite_master WHERE type='table'")
        ).fetchall()
    }
    if "users" in tables:
        user_cols = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(users)")).fetchall()
        }
        if "student_id" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN student_id VARCHAR"))
            connection.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_student_id ON users(student_id)")
            )

    if "record_attachments" in tables:
        att_cols = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(record_attachments)")).fetchall()
        }
        if "rclone_account_id" not in att_cols:
            connection.execute(
                text("ALTER TABLE record_attachments ADD COLUMN rclone_account_id VARCHAR")
            )

    if "app_migrations" not in tables:
        connection.execute(
            text("CREATE TABLE app_migrations (name VARCHAR PRIMARY KEY, applied_at DATETIME)")
        )

    # QBank PDF index evolution (keep migrations lightweight)
    if "qb_pdfs" in tables:
        qb_cols = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(qb_pdfs)")).fetchall()
        }
        if "department" not in qb_cols:
            connection.execute(text("ALTER TABLE qb_pdfs ADD COLUMN department VARCHAR"))
        if "course_name" not in qb_cols:
            connection.execute(text("ALTER TABLE qb_pdfs ADD COLUMN course_name VARCHAR"))
        if "semester_name" not in qb_cols:
            connection.execute(text("ALTER TABLE qb_pdfs ADD COLUMN semester_name VARCHAR"))
        if "exam_type" not in qb_cols:
            connection.execute(text("ALTER TABLE qb_pdfs ADD COLUMN exam_type VARCHAR"))
        if "submissions_count" not in qb_cols:
            connection.execute(text("ALTER TABLE qb_pdfs ADD COLUMN submissions_count INTEGER DEFAULT 0"))

    if "rclone_google_drive_config" in tables and "rclone_drive_accounts" in tables:
        already = connection.execute(
            text("SELECT 1 FROM app_migrations WHERE name = 'rclone_config_v1'")
        ).fetchone()
        if not already:
            old_rows = connection.execute(
            text(
                "SELECT id, client_id, client_secret, redirect_uri, token_json, "
                "authorized_email, token_updated_at, created_at, updated_at "
                "FROM rclone_google_drive_config WHERE client_id IS NOT NULL"
            )
            ).fetchall()
            for old in old_rows:
                exists = connection.execute(
                    text("SELECT 1 FROM rclone_drive_accounts WHERE id = :id"),
                    {"id": old[0]},
                ).fetchone()
                if exists:
                    continue
                token_status = "connected" if old[4] else "pending"
                connection.execute(
                    text(
                        "INSERT INTO rclone_drive_accounts "
                        "(id, label, client_id, client_secret, redirect_uri, token_json, "
                        "authorized_email, is_active, token_status, token_updated_at, created_at, updated_at) "
                        "VALUES (:id, :label, :cid, :cs, :ru, :tj, :email, 1, :status, :tu, :ca, :ua)"
                    ),
                    {
                        "id": old[0] if old[0] != "default" else str(uuid.uuid4()),
                        "label": old[5],
                        "cid": old[1],
                        "cs": old[2],
                        "ru": old[3] or "http://localhost",
                        "tj": old[4],
                        "email": old[5],
                        "status": token_status,
                        "tu": old[6],
                        "ca": old[7],
                        "ua": old[8],
                    },
                )
            connection.execute(
                text(
                    "INSERT OR IGNORE INTO app_migrations (name, applied_at) "
                    "VALUES ('rclone_config_v1', datetime('now'))"
                )
            )

    if "academic_calendar" in tables:
        ac_cols = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(academic_calendar)")).fetchall()
        }
        if "show_on_calendar_view" not in ac_cols:
            connection.execute(
                text("ALTER TABLE academic_calendar ADD COLUMN show_on_calendar_view BOOLEAN DEFAULT 1")
            )

    _migrate_course_catalog(connection)
    _migrate_teacher_profiles_global(connection)
    _migrate_teacher_profiles_fields(connection)


def _seed_reference_data(connection):
    """Seed reference data that must exist regardless of DB backend."""
    from services.course_list_seed import seed_course_list

    seed_course_list(connection)


def _migrate_course_catalog(connection):
  """Move course code/name into course_list; link batch courses via course_list_id."""
  tables = {
      r[0]
      for r in connection.execute(
          text("SELECT name FROM sqlite_master WHERE type='table'")
      ).fetchall()
  }
  if "course_list" not in tables:
      return

  course_cols = set()
  if "courses" in tables:
      course_cols = {
          row[1] for row in connection.execute(text("PRAGMA table_info(courses)")).fetchall()
      }

  if "courses" in tables and "course_list_id" not in course_cols:
      connection.execute(text("ALTER TABLE courses ADD COLUMN course_list_id VARCHAR"))
      course_cols.add("course_list_id")

  if "courses" in tables and "teacher2" not in course_cols:
      connection.execute(text("ALTER TABLE courses ADD COLUMN teacher2 VARCHAR"))

  if "courses" in tables and "code" in course_cols:
      rows = connection.execute(
          text("SELECT id, code, name, credit, course_list_id FROM courses")
      ).fetchall()
      for row in rows:
          cid, code, name, credit, list_id = row[0], row[1], row[2], row[3], row[4]
          if not code or not name:
              continue
          catalog = connection.execute(
              text("SELECT id FROM course_list WHERE code = :code"),
              {"code": code},
          ).fetchone()
          if catalog:
              catalog_id = catalog[0]
          else:
              catalog_id = str(uuid.uuid4())
              connection.execute(
                  text(
                      "INSERT INTO course_list (id, code, name, default_credit, created_at) "
                      "VALUES (:id, :code, :name, :credit, datetime('now'))"
                  ),
                  {
                      "id": catalog_id,
                      "code": code,
                      "name": name,
                      "credit": credit or 3.0,
                  },
              )
          if not list_id:
              connection.execute(
                  text("UPDATE courses SET course_list_id = :lid WHERE id = :id"),
                  {"lid": catalog_id, "id": cid},
              )


def _migrate_teacher_profiles_global(connection):
  """Drop batch_id / course_id from teacher_profiles (global directory)."""
  tables = {
      r[0]
      for r in connection.execute(
          text("SELECT name FROM sqlite_master WHERE type='table'")
      ).fetchall()
  }
  if "teacher_profiles" not in tables:
      return

  cols = {
      row[1] for row in connection.execute(text("PRAGMA table_info(teacher_profiles)")).fetchall()
  }
  if "batch_id" not in cols and "course_id" not in cols:
      return

  already = connection.execute(
      text("SELECT 1 FROM app_migrations WHERE name = 'teacher_profiles_global_v1'")
  ).fetchone()
  if already:
      return

  connection.execute(
      text(
          """
          CREATE TABLE teacher_profiles_new (
              id VARCHAR PRIMARY KEY,
              name VARCHAR NOT NULL,
              designation VARCHAR,
              contact_number VARCHAR,
              email VARCHAR,
              room_no VARCHAR,
              created_at DATETIME
          )
          """
      )
  )
  connection.execute(
      text(
          """
          INSERT INTO teacher_profiles_new
              (id, name, designation, contact_number, email, room_no, created_at)
          SELECT id, name, designation, contact_number, email, room_no, created_at
          FROM teacher_profiles
          """
      )
  )
  connection.execute(text("DROP TABLE teacher_profiles"))
  connection.execute(text("ALTER TABLE teacher_profiles_new RENAME TO teacher_profiles"))
  connection.execute(
      text(
          "INSERT OR IGNORE INTO app_migrations (name, applied_at) "
          "VALUES ('teacher_profiles_global_v1', datetime('now'))"
      )
  )


def _migrate_teacher_profiles_fields(connection):
    tables = {
        r[0]
        for r in connection.execute(
            text("SELECT name FROM sqlite_master WHERE type='table'")
        ).fetchall()
    }
    if "teacher_profiles" not in tables:
        return
    cols = {
        row[1] for row in connection.execute(text("PRAGMA table_info(teacher_profiles)")).fetchall()
    }
    if "department" not in cols:
        connection.execute(text("ALTER TABLE teacher_profiles ADD COLUMN department VARCHAR"))
    if "profile_url" not in cols:
        connection.execute(text("ALTER TABLE teacher_profiles ADD COLUMN profile_url VARCHAR"))
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_teacher_profiles_profile_url "
                "ON teacher_profiles(profile_url)"
            )
        )
    if "avatar_url" not in cols:
        connection.execute(text("ALTER TABLE teacher_profiles ADD COLUMN avatar_url VARCHAR"))


def _run_mysql_migrations(connection):
    """Widen byte-count columns to BIGINT — INT overflows on multi-GB drive quotas."""
    ac_col = connection.execute(
        text(
            "SELECT 1 FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academic_calendar' "
            "AND COLUMN_NAME = 'show_on_calendar_view'"
        )
    ).fetchone()
    if not ac_col:
        connection.execute(
            text(
                "ALTER TABLE academic_calendar "
                "ADD COLUMN show_on_calendar_view TINYINT(1) NOT NULL DEFAULT 1"
            )
        )

    big_int_columns = {
        "rclone_drive_accounts": ("storage_limit_bytes", "storage_usage_bytes"),
    }
    for table, columns in big_int_columns.items():
        for column in columns:
            data_type = connection.execute(
                text(
                    "SELECT DATA_TYPE FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
                ),
                {"t": table, "c": column},
            ).scalar()
            if data_type and data_type.lower() != "bigint":
                connection.execute(text(f"ALTER TABLE {table} MODIFY {column} BIGINT NULL"))


async def create_db_and_tables():
    import models  # noqa: F401 — register all tables on Base.metadata
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if IS_SQLITE:
            await conn.run_sync(_run_sqlite_migrations)
        else:
            await conn.run_sync(_run_mysql_migrations)
        await conn.run_sync(_seed_reference_data)
