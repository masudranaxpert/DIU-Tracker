import contextlib
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import create_db_and_tables
from utils.media_storage import ensure_upload_dirs
from auth.setup import auth_backend, fastapi_users
from auth.schemas import UserCreate, UserRead, UserUpdate
from routers import (
    batches, users, courses, course_list, records, notices, deadlines, feedbacks,
    students, teachers, admin_auth, admin_portal, rclone, drive, user_auth, section_pins, uploads,
    qbank,
)
from commands import run_cli


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield


app = FastAPI(
    title="DIU CSE Academic Tracker API",
    description="Academic records, notices, deadlines — powered by FastAPI Users",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FastAPI Users auth routes (custom login first — allows pending CR login)
app.include_router(user_auth.router, prefix="/auth/jwt", tags=["auth"])
app.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"])
app.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_verify_router(UserRead), prefix="/auth", tags=["auth"])

# Business routes (users before fastapi-users /users/* so /users/me allows inactive CR)
app.include_router(batches.router)
app.include_router(users.router)
app.include_router(fastapi_users.get_users_router(UserRead, UserUpdate), prefix="/users", tags=["users"])
app.include_router(course_list.router)
app.include_router(courses.router)
app.include_router(records.router)
app.include_router(notices.router)
app.include_router(deadlines.router)
app.include_router(feedbacks.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(section_pins.router)
app.include_router(uploads.router)
app.include_router(admin_auth.router)
app.include_router(admin_portal.router)
app.include_router(qbank.router)
app.include_router(rclone.router)
app.include_router(drive.router)

ensure_upload_dirs()
_avatars_dir = Path(__file__).resolve().parent / "uploads" / "avatars"
_teachers_dir = Path(__file__).resolve().parent / "uploads" / "teacher"
app.mount("/static/avatars", StaticFiles(directory=str(_avatars_dir)), name="avatars")
app.mount("/static/teachers", StaticFiles(directory=str(_teachers_dir)), name="teacher_photos")


@app.get("/")
def read_root():
    return {"message": "Welcome to DIU CSE Academic Tracker API", "status": "running"}


if __name__ == "__main__":
    run_cli(app)
