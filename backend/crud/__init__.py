"""
CRUD package — domain-split modules; import via `import crud` (unchanged for routers).
"""
from crud.academic_calendar import get_academic_calendar, save_academic_calendar
from crud.admin_portal import (
    list_crs_admin,
    list_feedbacks_admin,
    list_students_admin,
    list_teacher_profiles_admin,
)
from crud.batches import create_batch, get_batch, get_batches
from crud.course_list import (
    create_course_list_item,
    delete_course_list_item,
    get_course_list_by_code,
    get_course_list_item,
    get_course_list_items,
    list_course_list_admin,
)
from crud.courses import create_course, delete_course, get_course, get_courses, update_course
from crud.deadlines import create_deadline, delete_deadline, get_deadlines, update_deadline
from crud.feedbacks import create_feedback, get_feedbacks
from crud.groups import get_groups, update_groups
from crud.notices import create_notice, delete_notice, get_notices, update_notice
from crud.records import (
    create_attachment,
    create_record,
    delete_attachment,
    delete_record,
    get_record,
    get_records,
    increment_record_views,
    increment_views,
    update_record,
)
from crud.students import (
    clear_student_section_access,
    create_student,
    delete_student,
    get_students,
    lookup_student_by_id,
    register_student_with_pin,
    update_student,
    upsert_students,
)
from crud.teachers import (
    create_teacher_profile,
    delete_teacher_profile,
    get_teacher_profile,
    get_teacher_profiles,
    update_teacher_profile,
)
from crud.users import (
    delete_user,
    get_section_crs,
    get_section_pin,
    get_user,
    get_users,
    update_user,
    upsert_section_pin,
    verify_section_pin,
)

__all__ = [
    "get_batches",
    "get_batch",
    "create_batch",
    "get_user",
    "get_users",
    "update_user",
    "delete_user",
    "get_section_crs",
    "get_section_pin",
    "upsert_section_pin",
    "verify_section_pin",
    "lookup_student_by_id",
    "register_student_with_pin",
    "clear_student_section_access",
    "get_course_list_items",
    "get_course_list_item",
    "get_course_list_by_code",
    "list_course_list_admin",
    "create_course_list_item",
    "delete_course_list_item",
    "get_courses",
    "get_course",
    "create_course",
    "update_course",
    "delete_course",
    "get_records",
    "get_record",
    "create_record",
    "update_record",
    "delete_record",
    "increment_views",
    "increment_record_views",
    "create_attachment",
    "delete_attachment",
    "get_groups",
    "update_groups",
    "get_notices",
    "create_notice",
    "update_notice",
    "delete_notice",
    "get_deadlines",
    "create_deadline",
    "update_deadline",
    "delete_deadline",
    "get_feedbacks",
    "create_feedback",
    "get_students",
    "create_student",
    "upsert_students",
    "update_student",
    "delete_student",
    "get_teacher_profiles",
    "get_teacher_profile",
    "create_teacher_profile",
    "update_teacher_profile",
    "delete_teacher_profile",
    "list_students_admin",
    "list_teacher_profiles_admin",
    "list_feedbacks_admin",
    "list_crs_admin",
    "get_academic_calendar",
    "save_academic_calendar",
]
