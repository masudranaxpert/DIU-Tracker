"""Create admin user command."""
import uuid

from database import SessionLocal
from models import AdminUser
from utils.password import hash_password


def email_exists(email: str) -> bool:
    """Return True if an admin with this email already exists."""
    db = SessionLocal()
    try:
        return (
            db.query(AdminUser).filter(AdminUser.email == email).first() is not None
        )
    finally:
        db.close()


def create_admin(email: str, password: str, name: str = "Admin") -> bool:
    """Create an admin user. Returns True on success, False otherwise."""
    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(AdminUser.email == email).first()
        if existing:
            print(f"❌ Admin with email '{email}' already exists!")
            return False

        admin = AdminUser(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password(password),
            full_name=name,
            is_active=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("✅ Admin user created!")
        print(f"   Email: {email}")
        print(f"   Name:  {admin.full_name}")
        print(f"   ID:    {admin.id}")
        return True

    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"❌ Error: {e}")
        return False
    finally:
        db.close()
