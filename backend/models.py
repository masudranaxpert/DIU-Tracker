import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, ForeignKey, Integer
from sqlalchemy import String as _String
from sqlalchemy import Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from fastapi_users.db import SQLAlchemyBaseUserTable

from database import Base

# Default VARCHAR length so the schema is valid on MySQL/MariaDB (which require
# one); SQLite ignores it. Use Text for long content (descriptions, tokens, etc.).
DEFAULT_STRING_LENGTH = 255


class String(_String):
    def __init__(self, length: Optional[int] = None, *args, **kwargs):
        super().__init__(length or DEFAULT_STRING_LENGTH, *args, **kwargs)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(SQLAlchemyBaseUserTable[str], Base):
    """Unified user: auth + profile fields. CR access via is_cr flag."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    student_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True, index=True)
    batch_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sub_section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_cr: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    facebook_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    telegram_username: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="users")
    academic_records_created = relationship("AcademicRecord", back_populates="creator")
    notices_created = relationship("Notice", back_populates="creator")
    deadlines_created = relationship("Deadline", back_populates="creator")


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="batch")
    courses = relationship("Course", back_populates="batch", cascade="all, delete-orphan")
    academic_records = relationship("AcademicRecord", back_populates="batch", cascade="all, delete-orphan")
    course_groups = relationship("CourseGroup", back_populates="batch", cascade="all, delete-orphan")
    notices = relationship("Notice", back_populates="batch", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="batch", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="batch", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="batch", cascade="all, delete-orphan")
    section_pins = relationship("SectionPin", back_populates="batch", cascade="all, delete-orphan")


class SectionPin(Base):
    __tablename__ = "section_pins"
    __table_args__ = (UniqueConstraint("batch_id", "section", name="uq_section_pin_batch_section"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    section: Mapped[str] = mapped_column(String, nullable=False)
    pin: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="section_pins")


class CourseList(Base):
    """Global CSE course catalog (code + title). Seeded from course_list_content.py."""

    __tablename__ = "course_list"
    __table_args__ = (UniqueConstraint("code", name="uq_course_list_code"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    code: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    default_credit: Mapped[float] = mapped_column(Float, default=3.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch_courses = relationship("Course", back_populates="course_list")


class Course(Base):
    """Batch-specific course registration (links to catalog + section teachers)."""

    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("batch_id", "course_list_id", "section", name="uq_course_batch_list_section"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    course_list_id: Mapped[str] = mapped_column(
        String, ForeignKey("course_list.id", ondelete="RESTRICT"), nullable=False
    )
    teacher: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    teacher2: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sub_section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    credit: Mapped[float] = mapped_column(Float, default=3.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="courses")
    course_list = relationship("CourseList", back_populates="batch_courses")
    academic_records = relationship("AcademicRecord", back_populates="course", cascade="all, delete-orphan")
    course_groups = relationship("CourseGroup", back_populates="course", cascade="all, delete-orphan")
    notices = relationship("Notice", back_populates="course", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="course", cascade="all, delete-orphan")


class AcademicRecord(Base):
    __tablename__ = "academic_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[str] = mapped_column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    section: Mapped[str] = mapped_column(String, nullable=False)
    sub_section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    link: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    link_two: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    topics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    room: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    views: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="academic_records")
    course = relationship("Course", back_populates="academic_records")
    creator = relationship("User", back_populates="academic_records_created")
    attachments = relationship("RecordAttachment", back_populates="record", cascade="all, delete-orphan")


class CourseGroup(Base):
    __tablename__ = "course_groups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[str] = mapped_column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    section: Mapped[str] = mapped_column(String, nullable=False)
    sub_section: Mapped[str] = mapped_column(String, nullable=False)
    group_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="course_groups")
    course = relationship("Course", back_populates="course_groups")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("course_groups.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    group = relationship("CourseGroup", back_populates="members")


class RecordAttachment(Base):
    __tablename__ = "record_attachments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    record_id: Mapped[str] = mapped_column(String, ForeignKey("academic_records.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    public_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    rclone_account_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("rclone_drive_accounts.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    record = relationship("AcademicRecord", back_populates="attachments")
    rclone_account = relationship("RcloneDriveAccount")


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sub_section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String, default="normal")
    created_by: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    batch = relationship("Batch", back_populates="notices")
    course = relationship("Course", back_populates="notices")
    creator = relationship("User", back_populates="notices_created")


class Deadline(Base):
    __tablename__ = "deadlines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="deadlines")
    course = relationship("Course", back_populates="deadlines")
    creator = relationship("User", back_populates="deadlines_created")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    batch_id: Mapped[str] = mapped_column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    section: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, default=5)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    author_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    author_session: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="feedbacks")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    student_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    batch_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=True
    )
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sub_section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    section_pin: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="students")


class TeacherProfile(Base):
    """Global faculty directory — not tied to batch or course."""

    __tablename__ = "teacher_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    designation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    room_no: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    profile_url: Mapped[Optional[str]] = mapped_column(String, nullable=True, unique=True, index=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class RcloneDriveAccount(Base):
    """Google Drive OAuth account for rclone / backups (multiple allowed)."""

    __tablename__ = "rclone_drive_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    label: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    client_id: Mapped[str] = mapped_column(String, nullable=False)
    client_secret: Mapped[str] = mapped_column(String, nullable=False)
    redirect_uri: Mapped[str] = mapped_column(String, default="http://localhost", nullable=False)
    token_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    authorized_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    storage_limit_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    storage_usage_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    quota_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    token_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# -----------------------------
# Question Bank (DIUQBank) PDFs
# -----------------------------


class QbPdf(Base):
    """Local index of DIUQBank questions (one row per question).

    Sourced from the questions list page so a single sync captures every
    question quickly. `pdf_url` points to the DIUQBank question page, where the
    actual PDFs/submissions live (viewer + credit stay on DIUQBank).
    """

    __tablename__ = "qb_pdfs"
    __table_args__ = (UniqueConstraint("pdf_url", name="uq_qb_pdfs_pdf_url"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    # Used for credit/deep-link back to DIUQBank question page:
    question_external_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    pdf_url: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    course_name: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    semester_name: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    exam_type: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    submissions_count: Mapped[int] = mapped_column(Integer, default=0)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class QbSubmissionCache(Base):
    """Cached direct PDF links for a question (scraped from DIUQBank detail page).

    Rows expire after 24 hours and are removed by a daily purge job.
    """

    __tablename__ = "qb_submission_cache"
    __table_args__ = (
        UniqueConstraint(
            "question_external_id",
            "submission_external_id",
            name="uq_qb_submission_cache_question_sub",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    question_external_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    submission_external_id: Mapped[int] = mapped_column(Integer, nullable=False)
    pdf_url: Mapped[str] = mapped_column(String, nullable=False)
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    uploader: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cached_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
