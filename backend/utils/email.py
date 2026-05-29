"""Email configuration and SMTP delivery with a console fallback for local dev."""
from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from typing import Optional


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def is_email_verification_enabled() -> bool:
    return _env_flag("EMAIL_VERIFICATION_ENABLED", False)


def frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:4444").rstrip("/")


class SmtpConfig:
    def __init__(self) -> None:
        self.host = os.environ.get("SMTP_HOST", "").strip()
        self.port = int(os.environ.get("SMTP_PORT") or 587)
        self.user = os.environ.get("SMTP_USER", "").strip()
        self.password = os.environ.get("SMTP_PASSWORD", "")
        self.sender = os.environ.get("SMTP_FROM", "").strip() or self.user
        self.use_tls = _env_flag("SMTP_USE_TLS", True)

    @property
    def is_configured(self) -> bool:
        return bool(self.host and self.sender)


def send_email(to: str, subject: str, html_body: str, text_body: Optional[str] = None) -> None:
    """Deliver an email, or print it when SMTP is not configured (dev/local)."""
    config = SmtpConfig()
    if not config.is_configured:
        print(f"[email:console] To: {to} | Subject: {subject}\n{text_body or html_body}\n")
        return

    message = EmailMessage()
    message["From"] = config.sender
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text_body or "Open this email in an HTML-capable client.")
    message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(config.host, config.port, timeout=20) as server:
        if config.use_tls:
            server.starttls()
        if config.user:
            server.login(config.user, config.password)
        server.send_message(message)


def send_verification_email(to: str, token: str) -> None:
    link = f"{frontend_url()}/verify-email?token={token}"
    subject = "Verify your email — DIU Academic Tracker"
    text_body = (
        "Welcome to DIU Academic Tracker!\n\n"
        f"Verify your email to finish your CR application:\n{link}\n\n"
        "This link expires in 1 hour. If you did not request this, ignore this email."
    )
    html_body = f"""
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 8px">Verify your email</h2>
      <p style="color:#475569;line-height:1.6">
        Welcome to <strong>DIU Academic Tracker</strong>. Confirm your email to finish your CR application.
      </p>
      <p style="margin:24px 0">
        <a href="{link}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">
          Verify Email
        </a>
      </p>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6">
        This link expires in 1 hour. If the button does not work, copy this URL:<br>
        <span style="word-break:break-all;color:#4f46e5">{link}</span>
      </p>
    </div>
    """
    send_email(to, subject, html_body, text_body)
