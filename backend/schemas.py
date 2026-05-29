from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, date

# --- Batch Schemas ---
class BatchBase(BaseModel):
    name: str

class BatchCreate(BatchBase):
    pass

class BatchResponse(BatchBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class BatchAdminStats(BaseModel):
    records: int = 0
    attachments: int = 0
    drive_attachments: int = 0
    courses: int = 0
    groups: int = 0
    group_members: int = 0
    notices: int = 0
    deadlines: int = 0
    students: int = 0
    feedbacks: int = 0


class BatchAdminItem(BatchResponse):
    stats: BatchAdminStats


class PaginatedBatchAdminResponse(BaseModel):
    items: List[BatchAdminItem]
    total: int
    page: int
    limit: int
    total_pages: int


class BatchPurgeStartBody(BaseModel):
    include_drive: bool = False


class BatchPurgeJobResponse(BaseModel):
    job_id: str
    batch_id: str
    batch_name: str
    include_drive: bool
    status: str
    phase: str
    current: int
    total: int
    drive_deleted: int = 0
    drive_skipped: int = 0
    drive_failed: int = 0
    db_stats: Optional[dict] = None
    message: str
    errors: List[str] = []
    started_at: Optional[str] = None
    finished_at: Optional[str] = None


# --- User Schemas (public / admin) ---
class UserPublicResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    student_id: Optional[str] = None
    batch_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    is_cr: bool = False
    is_active: bool = True
    is_verified: bool = False
    avatar_url: Optional[str] = None
    facebook_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    created_at: Optional[datetime] = None

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v) if v is not None else v

    class Config:
        from_attributes = True


class UserProfilePatch(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    facebook_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_chat_id: Optional[str] = None


class UserAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    batch_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    is_cr: Optional[bool] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    facebook_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_chat_id: Optional[str] = None


class SectionPinStatus(BaseModel):
    pin_required: bool
    section_pin: Optional[str] = None


class SectionPinUpdate(BaseModel):
    batch_id: str
    section: str
    section_pin: Optional[str] = None


class SectionPinVerify(BaseModel):
    batch_id: str
    section: str
    pin: str


class SectionPinVerifyResult(BaseModel):
    valid: bool


class StudentLookupResult(BaseModel):
    found: bool
    name: Optional[str] = None
    phone: Optional[str] = None


class StudentIdCheck(BaseModel):
    student_id: str

    @field_validator("student_id", mode="before")
    @classmethod
    def coerce_student_id(cls, v):
        return str(v).strip() if v is not None else v


class SectionPinUnlock(BaseModel):
    batch_id: str
    section: str
    pin: str
    student_id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    sub_section: Optional[str] = None

    @field_validator("pin", "student_id", mode="before")
    @classmethod
    def coerce_str_fields(cls, v):
        return str(v).strip() if v is not None else v

    @field_validator("section", mode="before")
    @classmethod
    def coerce_section(cls, v):
        return str(v).strip().upper() if v is not None else v


class SectionPinUnlockResult(BaseModel):
    valid: bool
    student: Optional["StudentResponse"] = None
    error: Optional[str] = None
    message: Optional[str] = None


# --- Course catalog (global list) ---
class CourseListBase(BaseModel):
    code: str
    name: str
    default_credit: float = 3.0


class CourseListCreate(CourseListBase):
    pass


class CourseListResponse(CourseListBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedCourseListResponse(BaseModel):
    items: List[CourseListResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# --- Batch course registration ---
class CourseBase(BaseModel):
    batch_id: str
    course_list_id: str
    teacher: Optional[str] = None
    teacher2: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    credit: Optional[float] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    course_list_id: Optional[str] = None
    teacher: Optional[str] = None
    teacher2: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    credit: Optional[float] = None


class CourseResponse(BaseModel):
    id: str
    batch_id: str
    course_list_id: str
    code: str
    name: str
    teacher: Optional[str] = None
    teacher2: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    credit: float
    created_at: datetime

    class Config:
        from_attributes = True


# --- Attachment Schemas ---
class AttachmentBase(BaseModel):
    name: str
    type: str
    url: str
    public_id: Optional[str] = None
    rclone_account_id: Optional[str] = None

class AttachmentCreate(AttachmentBase):
    pass

class AttachmentResponse(AttachmentBase):
    id: str
    record_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Academic Record Schemas ---
class AcademicRecordBase(BaseModel):
    batch_id: str
    course_id: str
    section: str
    sub_section: Optional[str] = None
    date: date
    type: str
    title: str
    description: Optional[str] = None
    link: Optional[str] = None
    link_two: Optional[str] = None
    topics: Optional[str] = None
    time: Optional[str] = None
    room: Optional[str] = None

class AcademicRecordCreate(AcademicRecordBase):
    created_by: Optional[str] = None

class AcademicRecordUpdate(BaseModel):
    section: Optional[str] = None
    sub_section: Optional[str] = None
    date: Optional[date] = None
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    link_two: Optional[str] = None
    topics: Optional[str] = None
    time: Optional[str] = None
    room: Optional[str] = None

class SimpleUserResponse(BaseModel):
    full_name: Optional[str]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True

class AcademicRecordResponse(AcademicRecordBase):
    id: str
    views: int
    created_by: Optional[str]
    created_at: datetime
    attachments: List[AttachmentResponse] = []
    uploader: Optional[SimpleUserResponse] = Field(default=None, validation_alias="creator")

    class Config:
        from_attributes = True
        populate_by_name = True


# --- Course Group & Members Schemas ---
class GroupMemberBase(BaseModel):
    student_id: str
    name: str

class GroupMemberCreate(GroupMemberBase):
    pass

class GroupMemberResponse(GroupMemberBase):
    id: str
    group_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class CourseGroupBase(BaseModel):
    batch_id: str
    course_id: str
    section: str
    sub_section: str
    group_number: int

class CourseGroupCreate(CourseGroupBase):
    members: List[GroupMemberCreate] = []

class CourseGroupResponse(CourseGroupBase):
    id: str
    created_at: datetime
    members: List[GroupMemberResponse] = []

    class Config:
        from_attributes = True


# --- Notice Schemas ---
class NoticeBase(BaseModel):
    batch_id: str
    course_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    title: str
    content: str = ""
    priority: Optional[str] = "normal"
    expires_at: Optional[datetime] = None

class NoticeCreate(NoticeBase):
    created_by: Optional[str] = None

class NoticeUpdate(BaseModel):
    course_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[str] = None
    expires_at: Optional[datetime] = None

class NoticeResponse(NoticeBase):
    id: str
    created_by: Optional[str]
    created_at: datetime
    uploader: Optional[SimpleUserResponse] = Field(default=None, validation_alias="creator")

    class Config:
        from_attributes = True


# --- Deadline Schemas ---
class DeadlineBase(BaseModel):
    batch_id: str
    course_id: Optional[str] = None
    type: str
    title: str
    date: date
    description: Optional[str] = None

class DeadlineCreate(DeadlineBase):
    created_by: Optional[str] = None

class DeadlineUpdate(BaseModel):
    course_id: Optional[str] = None
    type: Optional[str] = None
    title: Optional[str] = None
    date: Optional[date] = None
    description: Optional[str] = None

class DeadlineResponse(DeadlineBase):
    id: str
    created_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Feedback Schemas ---
class FeedbackBase(BaseModel):
    batch_id: str
    section: str
    message: str
    category: str
    rating: Optional[int] = 5
    is_anonymous: Optional[bool] = False
    author_name: Optional[str] = None
    author_session: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackResponse(FeedbackBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Student Schemas ---
class StudentBase(BaseModel):
    student_id: str
    name: str
    phone: Optional[str] = None
    batch_id: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None
    section_pin: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    section: Optional[str] = None
    sub_section: Optional[str] = None

class StudentResponse(StudentBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Teacher Profile Schemas (global — no batch/course) ---
class TeacherProfileBase(BaseModel):
    name: str
    designation: Optional[str] = None
    department: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    room_no: Optional[str] = None
    profile_url: Optional[str] = None
    avatar_url: Optional[str] = None


class TeacherProfileCreate(TeacherProfileBase):
    pass


class TeacherProfileUpdate(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    room_no: Optional[str] = None
    profile_url: Optional[str] = None
    avatar_url: Optional[str] = None


class TeacherScrapeJobResponse(BaseModel):
    job_id: Optional[str] = None
    status: str = "idle"
    phase: str = ""
    current: int = 0
    total: int = 0
    created: int = 0
    updated: int = 0
    message: str = ""
    errors: List[str] = []
    started_at: Optional[str] = None
    finished_at: Optional[str] = None

class TeacherProfileResponse(TeacherProfileBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Admin portal (paginated) ---
class StudentAdminItem(StudentResponse):
    batch_name: Optional[str] = None
    cr_names: List[str] = []


class PaginatedStudentAdminResponse(BaseModel):
    items: List[StudentAdminItem]
    total: int
    page: int
    limit: int
    total_pages: int


class TeacherProfileAdminItem(TeacherProfileResponse):
    pass


class PaginatedTeacherProfileAdminResponse(BaseModel):
    items: List[TeacherProfileAdminItem]
    total: int
    page: int
    limit: int
    total_pages: int


class FeedbackAdminItem(FeedbackResponse):
    batch_name: Optional[str] = None


class PaginatedFeedbackAdminResponse(BaseModel):
    items: List[FeedbackAdminItem]
    total: int
    page: int
    limit: int
    total_pages: int


class CRAdminItem(UserPublicResponse):
    batch_name: Optional[str] = None


class PaginatedCRAdminResponse(BaseModel):
    items: List[CRAdminItem]
    total: int
    page: int
    limit: int
    total_pages: int


# --- Question Bank Schemas ---


class QbPdfResponse(BaseModel):
    question_external_id: int
    pdf_url: str
    department: Optional[str] = None
    course_name: Optional[str] = None
    semester_name: Optional[str] = None
    exam_type: Optional[str] = None
    submissions_count: int = 0
    scraped_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QbPaginatedPdfsResponse(BaseModel):
    items: List[QbPdfResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class QbPdfFiltersResponse(BaseModel):
    departments: List[str] = []
    courses: List[str] = []
    semesters: List[str] = []
    exam_types: List[str] = []


class QbSubmissionItem(BaseModel):
    id: int
    pdf_url: str
    section: Optional[str] = None
    uploader: Optional[str] = None


class QbSubmissionsResponse(BaseModel):
    question_id: int
    submissions: List[QbSubmissionItem] = []
    status: str = "ready"  # ready | refreshing | error
    from_cache: bool = False
    error: Optional[str] = None


class QbScrapeJobResponse(BaseModel):
    job_id: Optional[str] = None
    status: str
    phase: str
    current: int
    total: int
    created: int = 0
    updated: int = 0
    message: str
    errors: List[str] = []
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
