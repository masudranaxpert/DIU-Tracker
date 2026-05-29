"""Local static file helpers for avatars and teacher photos."""
from __future__ import annotations

import mimetypes
import re
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

BACKEND_ROOT = Path(__file__).resolve().parent.parent
AVATARS_DIR = BACKEND_ROOT / "uploads" / "avatars"
TEACHERS_DIR = BACKEND_ROOT / "uploads" / "teacher"

AVATARS_STATIC_PREFIX = "/static/avatars/"
TEACHERS_STATIC_PREFIX = "/static/teachers/"


def ensure_upload_dirs() -> None:
    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    TEACHERS_DIR.mkdir(parents=True, exist_ok=True)


def normalize_department(raw: Optional[str]) -> Optional[str]:
    if not raw or not str(raw).strip():
        return None
    text = str(raw).strip()
    lower = text.lower()
    if "computer science and engineering" in lower:
        return "CSE"
    return text


def static_path_from_url(url: Optional[str], allowed_prefix: str) -> Optional[Path]:
    """Map stored URL (/static/... or absolute) to a file under backend/uploads."""
    if not url or not str(url).strip():
        return None
    value = str(url).strip()
    match = re.search(rf"{re.escape(allowed_prefix)}[^\s?#]+", value)
    if not match:
        return None
    static_path = match.group(0)  # e.g. /static/avatars/foo.jpg
    filename = static_path.split("/")[-1]
    if not filename:
        return None

    if allowed_prefix == AVATARS_STATIC_PREFIX:
        base = AVATARS_DIR
    elif allowed_prefix == TEACHERS_STATIC_PREFIX:
        base = TEACHERS_DIR
    else:
        # Fallback: infer by prefix segment
        if "/avatars/" in allowed_prefix:
            base = AVATARS_DIR
        elif "/teachers/" in allowed_prefix:
            base = TEACHERS_DIR
        else:
            return None

    candidate = (base / filename).resolve()
    try:
        candidate.relative_to(base.resolve())
    except ValueError:
        return None
    return candidate


def delete_static_media(url: Optional[str], allowed_prefix: str) -> None:
    path = static_path_from_url(url, allowed_prefix)
    if path and path.is_file():
        try:
            path.unlink()
        except OSError:
            pass


def ext_from_response(content_type: Optional[str], source_url: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    guessed = mimetypes.guess_extension(ct) if ct else None
    if guessed == ".jpe":
        guessed = ".jpg"
    if guessed:
        return guessed
    path = urlparse(source_url).path.lower()
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if path.endswith(ext):
            return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"


PLACEHOLDER_IMAGE_NAMES = frozenset({"pic.jpg", "pic.png", "pic.gif", "pic.webp"})


def is_placeholder_image_url(url: Optional[str]) -> bool:
    if not url:
        return True
    name = urlparse(url).path.split("/")[-1].lower()
    return name in PLACEHOLDER_IMAGE_NAMES


def profile_slug_from_url(profile_url: str) -> str:
    path = urlparse(profile_url).path.rstrip("/")
    slug = path.split("/")[-1].replace(".html", "")
    slug = re.sub(r"[^\w\-]", "_", slug)
    return slug or "teacher"
