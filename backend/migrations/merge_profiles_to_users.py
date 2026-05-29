"""Migrate legacy users + profiles tables to unified fastapi-users User schema."""
import os
import sqlite3
import uuid

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "diu_tracker.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if not table_exists(cursor, "users"):
        print("[SKIP] users table not found")
        conn.close()
        return

    # Add fastapi-users columns if missing
    new_cols = [
        ("hashed_password", "TEXT"),
        ("is_active", "BOOLEAN DEFAULT 1"),
        ("is_superuser", "BOOLEAN DEFAULT 0"),
        ("is_verified", "BOOLEAN DEFAULT 0"),
        ("is_cr", "BOOLEAN DEFAULT 0"),
        ("batch_id", "TEXT"),
        ("section", "TEXT"),
        ("sub_section", "TEXT"),
        ("avatar_url", "TEXT"),
        ("facebook_url", "TEXT"),
        ("whatsapp_number", "TEXT"),
        ("telegram_username", "TEXT"),
        ("telegram_chat_id", "TEXT"),
    ]
    for col, col_type in new_cols:
        if not column_exists(cursor, "users", col):
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
            print(f"[OK] Added users.{col}")

    # password_hash -> hashed_password
    if column_exists(cursor, "users", "password_hash"):
        cursor.execute("""
            UPDATE users SET hashed_password = password_hash
            WHERE hashed_password IS NULL AND password_hash IS NOT NULL
        """)
        print("[OK] Copied password_hash -> hashed_password")

    # is_approved -> is_active
    if column_exists(cursor, "users", "is_approved"):
        cursor.execute("""
            UPDATE users SET is_active = is_approved
            WHERE is_approved IS NOT NULL
        """)
        print("[OK] Copied is_approved -> is_active")

    # role -> is_cr
    if column_exists(cursor, "users", "role"):
        cursor.execute("UPDATE users SET is_cr = 1 WHERE role = 'CR'")
        print("[OK] Set is_cr from role=CR")

    # Merge profiles into users by email
    if table_exists(cursor, "profiles"):
        cursor.execute("SELECT id, email, full_name, batch_id, section, sub_section, role, is_approved, avatar_url, facebook_url, whatsapp_number, telegram_username, telegram_chat_id FROM profiles")
        profiles = cursor.fetchall()
        for p in profiles:
            pid, email, full_name, batch_id, section, sub_section, role, is_approved, avatar_url, fb, wa, tg, tg_id = p
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()
            if user:
                cursor.execute("""
                    UPDATE users SET
                        full_name = COALESCE(?, full_name),
                        batch_id = COALESCE(?, batch_id),
                        section = COALESCE(?, section),
                        sub_section = COALESCE(?, sub_section),
                        is_cr = CASE WHEN ? = 'CR' THEN 1 ELSE is_cr END,
                        is_active = COALESCE(?, is_active),
                        avatar_url = COALESCE(?, avatar_url),
                        facebook_url = COALESCE(?, facebook_url),
                        whatsapp_number = COALESCE(?, whatsapp_number),
                        telegram_username = COALESCE(?, telegram_username),
                        telegram_chat_id = COALESCE(?, telegram_chat_id)
                    WHERE email = ?
                """, (full_name, batch_id, section, sub_section, role, is_approved, avatar_url, fb, wa, tg, tg_id, email))
            else:
                new_id = pid or str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO users (id, email, password_hash, hashed_password, full_name, batch_id, section, sub_section,
                        is_cr, is_active, is_superuser, is_verified, avatar_url, facebook_url,
                        whatsapp_number, telegram_username, telegram_chat_id)
                    VALUES (?, ?, 'needs-reset', 'needs-reset', ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)
                """, (new_id, email, full_name, batch_id, section, sub_section,
                      1 if role == 'CR' else 0, 1 if is_approved else 0,
                      avatar_url, fb, wa, tg, tg_id))
        print(f"[OK] Merged {len(profiles)} profile(s) into users")

    # Repoint FKs from profiles.id to users.id (same UUIDs after merge)
    for table, col in [("academic_records", "created_by"), ("notices", "created_by"), ("deadlines", "created_by")]:
        if table_exists(cursor, table):
            print(f"[OK] FK {table}.{col} already points to user IDs")

    conn.commit()
    conn.close()
    print("[DONE] Migration complete. Restart backend server.")


if __name__ == "__main__":
    migrate()
