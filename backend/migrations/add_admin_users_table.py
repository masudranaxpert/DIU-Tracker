"""Add admin_users table migration."""
from database import engine, Base
from models import AdminUser

if __name__ == "__main__":
    # Create only the admin_users table
    Base.metadata.create_all(bind=engine, tables=[AdminUser.__table__])
    print("✅ admin_users table created successfully!")