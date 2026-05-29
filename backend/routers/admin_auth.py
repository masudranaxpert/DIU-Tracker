"""Admin authentication routes."""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel, EmailStr

from database import SessionLocal
from models import AdminUser
from utils.password import hash_password, verify_password

router = APIRouter(prefix="/auth/admin", tags=["admin-auth"])
security = HTTPBearer()

# JWT config (shared with main auth)
JWT_SECRET = "your-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 days


def create_admin_token(admin_id: str) -> str:
    """Create JWT token for admin user."""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": admin_id,
        "type": "admin",
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class AdminResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/register", response_model=AdminResponse)
def register_admin(data: AdminRegisterRequest, db=Depends(get_db)):
    """Register a new admin user."""
    # Check if email already exists
    existing = db.query(AdminUser).filter(AdminUser.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new admin
    admin = AdminUser(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.post("/login")
def login_admin(data: AdminLoginRequest, db=Depends(get_db)):
    """Admin login with JWT token."""
    admin = db.query(AdminUser).filter(
        AdminUser.email == data.email,
        AdminUser.is_active == True
    ).first()

    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()

    # Create token
    token = create_admin_token(admin.id)

    return {
        "token": token,
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "full_name": admin.full_name,
            "is_active": admin.is_active
        }
    }


@router.get("/me")
def get_admin_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    """Get current admin user from token."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin":
            raise HTTPException(status_code=403, detail="Not an admin token")

        admin = db.query(AdminUser).filter(AdminUser.id == payload["sub"]).first()
        if not admin or not admin.is_active:
            raise HTTPException(status_code=404, detail="Admin not found")

        return {
            "id": admin.id,
            "email": admin.email,
            "full_name": admin.full_name,
            "is_active": admin.is_active
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/logout")
def logout_admin():
    """Logout admin (client should discard token)."""
    return {"message": "Logged out successfully"}


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
):
    """Dependency: require valid super-admin JWT."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin":
            raise HTTPException(status_code=403, detail="Not an admin token")
        admin = db.query(AdminUser).filter(AdminUser.id == payload["sub"]).first()
        if not admin or not admin.is_active:
            raise HTTPException(status_code=404, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")