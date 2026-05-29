# CLI Commands Package
import getpass
import re
import sys

from .create_admin import create_admin, email_exists

__all__ = [
    'create_admin',
    'run_cli',
]

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _prompt_email() -> str:
    while True:
        email = input("📧 Email: ").strip().lower()
        if not email:
            print("   ❌ Email is required.")
            continue
        if not _EMAIL_RE.match(email):
            print("   ❌ Invalid email format. Try again.")
            continue
        if email_exists(email):
            print(f"   ❌ An admin with '{email}' already exists. Use a different email.")
            continue
        return email


def _prompt_name() -> str:
    name = input("👤 Name [Admin]: ").strip()
    return name or "Admin"


def _prompt_password() -> str:
    while True:
        password = getpass.getpass("🔒 Password (min 6 chars): ").strip()
        if len(password) < 6:
            print("   ❌ Password must be at least 6 characters.")
            continue
        confirm = getpass.getpass("🔒 Confirm password: ").strip()
        if password != confirm:
            print("   ❌ Passwords do not match. Try again.")
            continue
        return password


def _create_admin_interactive() -> None:
    print("=== Create Admin User ===")
    print("(prompts only — no arguments needed; press Ctrl+C to cancel)\n")
    try:
        email = _prompt_email()
        name = _prompt_name()
        password = _prompt_password()
    except (KeyboardInterrupt, EOFError):
        print("\n⚠️  Cancelled.")
        sys.exit(1)

    ok = create_admin(email, password, name)
    sys.exit(0 if ok else 1)


def run_cli(app):
    """Run CLI commands.

    `python main.py` or `python main.py createadmin` both start the interactive
    admin creation flow — it asks for name, email and password, no args required.
    """
    command = sys.argv[1].lower() if len(sys.argv) > 1 else "createadmin"

    if command in ("createadmin", "create-admin", "admin"):
        _create_admin_interactive()
    elif command in ("-h", "--help", "help"):
        print("Usage: python main.py [createadmin]")
        print()
        print("createadmin   Interactively create an admin user")
        print("              (prompts for email, name and password — no arguments).")
    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python main.py --help' for usage.")
        sys.exit(1)
