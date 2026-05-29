"""Scrape CSE faculty list + profile pages from faculty.daffodilvarsity.edu.bd."""
from __future__ import annotations

import re
import time
from dataclasses import dataclass
import hashlib
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from utils.media_storage import (
    TEACHERS_DIR,
    TEACHERS_STATIC_PREFIX,
    ext_from_response,
    is_placeholder_image_url,
    normalize_department,
    profile_slug_from_url,
)

BASE_URL = "https://faculty.daffodilvarsity.edu.bd"
CSE_LIST_URL = f"{BASE_URL}/teachers/cse.html"
DEFAULT_DEPARTMENT = "CSE"


@dataclass
class FacultyListItem:
    name: str
    designation: Optional[str]
    profile_url: str
    image_url: Optional[str] = None


@dataclass
class FacultyProfileData:
    name: str
    designation: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    contact_number: Optional[str] = None
    room_no: Optional[str] = None
    profile_url: str = ""
    image_url: Optional[str] = None


def _session_get(session, url: str) -> str:
    resp = session.get(
        url,
        headers={
            "Referer": f"{BASE_URL}/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code} for {url}")
    return resp.text or ""


def _abs_image_url(src: Optional[str]) -> Optional[str]:
    if not src or not str(src).strip():
        return None
    full = urljoin(BASE_URL, str(src).strip())
    if is_placeholder_image_url(full):
        return None
    return full


def discover_list_page_urls(html: str, first_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls = [first_url]
    for a in soup.select("ul.pagination a[href]"):
        href = (a.get("href") or "").strip()
        if not href or href.startswith("#"):
            continue
        full = urljoin(BASE_URL, href)
        if "/teachers/cse" in full and full not in urls:
            urls.append(full)
    return urls


def parse_list_page(html: str) -> list[FacultyListItem]:
    soup = BeautifulSoup(html, "html.parser")
    items: list[FacultyListItem] = []
    seen_urls: set[str] = set()

    for li in soup.select("li.item.item-designer"):
        link = li.select_one("h3 a.fox")
        if not link:
            continue
        name = link.get_text(" ", strip=True)
        href = (link.get("href") or "").strip()
        if not name or not href:
            continue
        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen_urls:
            continue
        seen_urls.add(profile_url)

        designation = None
        h4 = li.select_one("h4")
        if h4:
            designation = h4.get_text(" ", strip=True) or None

        img = li.select_one("img")
        image_url = _abs_image_url(img.get("src") if img else None)

        items.append(
            FacultyListItem(
                name=name,
                designation=designation,
                profile_url=profile_url,
                image_url=image_url,
            )
        )

    return items


def _profile_field(soup: BeautifulSoup, *labels: str) -> Optional[str]:
    label_set = {lb.lower().rstrip(":") for lb in labels}
    for row in soup.select(".profile-row0, .profile-row1"):
        left = row.select_one(".profile-row-left")
        right = row.select_one(".profile-row-right")
        if not left or not right:
            continue
        key = left.get_text(" ", strip=True).lower().rstrip(":").strip()
        if key in label_set:
            val = right.get_text(" ", strip=True)
            return val or None
    return None


def _clean_phone(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    val = re.sub(r"\s+", " ", raw).strip()
    if not val or val.lower() in {"n/a", "-", "—"}:
        return None
    return val


def _extract_phone_numbers(*raw_values: Optional[str]) -> Optional[str]:
    """
    Extract only phone numbers from one or more raw fields.
    - Removes Ext / Extension parts
    - Returns comma-separated unique numbers preserving order
    """
    nums: list[str] = []
    seen: set[str] = set()

    for raw in raw_values:
        if not raw:
            continue
        text = str(raw)
        # Drop extension segments like "Ext-15101" / "Ext: 15101" / "Extension 15101"
        text = re.sub(r"(?i)\b(ext|extension)\b\s*[-:]*\s*\d+", " ", text)
        # Find phone-like chunks (keep + and digits)
        for m in re.finditer(r"\+?\d[\d\s\-]{6,}\d", text):
            s = re.sub(r"[^\d+]", "", m.group(0))
            if not s:
                continue
            # normalize multiple + (rare)
            if s.count("+") > 1:
                s = "+" + s.replace("+", "")
            if s not in seen:
                seen.add(s)
                nums.append(s)

    return ", ".join(nums) if nums else None


def _parse_profile_image(soup: BeautifulSoup) -> Optional[str]:
    img = soup.select_one("div.profaile-pic img") or soup.select_one(".profaile-pic img")
    if not img:
        return None
    return _abs_image_url(img.get("src"))


def parse_profile_page(html: str, profile_url: str, fallback: FacultyListItem) -> FacultyProfileData:
    soup = BeautifulSoup(html, "html.parser")

    header_name = soup.select_one(".profile-header span")
    name = (header_name.get_text(" ", strip=True) if header_name else None) or fallback.name

    header_desig = soup.select_one(".profile-header span + span")
    designation = _profile_field(soup, "designation") or (
        header_desig.get_text(" ", strip=True) if header_desig else None
    ) or fallback.designation

    department = normalize_department(
        _profile_field(soup, "department") or DEFAULT_DEPARTMENT
    )
    email = _profile_field(soup, "e-mail", "email")
    cell = _profile_field(soup, "cell-phone", "cell phone", "mobile")
    phone = _profile_field(soup, "phone")
    contact = _extract_phone_numbers(cell, phone) or _clean_phone(cell or phone)
    room = _profile_field(soup, "room no", "room", "office")
    image_url = _parse_profile_image(soup) or fallback.image_url

    return FacultyProfileData(
        name=name,
        designation=designation,
        department=department,
        email=email,
        contact_number=contact,
        room_no=room,
        profile_url=profile_url,
        image_url=image_url,
    )


def download_teacher_photo(session, image_url: str, profile_url: str) -> Optional[str]:
    """Download remote faculty photo into uploads/teacher; return /static/teachers/... path."""
    if not image_url or is_placeholder_image_url(image_url):
        return None

    TEACHERS_DIR.mkdir(parents=True, exist_ok=True)
    slug = profile_slug_from_url(profile_url)
    # Avoid collisions when multiple teachers share same name/slug:
    # include short hash of profile_url in filename.
    h = hashlib.sha1(profile_url.encode("utf-8")).hexdigest()[:8]

    resp = session.get(
        image_url,
        headers={
            "Referer": profile_url or f"{BASE_URL}/",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
    )
    if resp.status_code >= 400:
        return None

    body = getattr(resp, "content", None) or getattr(resp, "body", None)
    if not body:
        text = getattr(resp, "text", None)
        if text and isinstance(text, str):
            body = text.encode("utf-8", errors="ignore")
    if not body or len(body) < 128:
        return None

    headers = getattr(resp, "headers", {}) or {}
    content_type = headers.get("content-type")
    # httpcloak may expose headers as list[str]
    if isinstance(content_type, (list, tuple)):
        content_type = content_type[0] if content_type else None

    ext = ext_from_response(content_type, image_url)
    filename = f"{slug}_{h}{ext}"
    dest: Path = TEACHERS_DIR / filename
    dest.write_bytes(body)
    return f"{TEACHERS_STATIC_PREFIX}{filename}"


def scrape_cse_faculty(
    session,
    *,
    on_progress: Optional[Callable[[str, int, int], None]] = None,
    delay_seconds: float = 0.35,
) -> list[FacultyProfileData]:
    """Fetch all CSE faculty across paginated list pages and profile details."""
    first_html = _session_get(session, CSE_LIST_URL)
    list_urls = discover_list_page_urls(first_html, CSE_LIST_URL)

    roster: list[FacultyListItem] = []
    seen_profile: set[str] = set()
    for idx, list_url in enumerate(list_urls):
        html = first_html if idx == 0 else _session_get(session, list_url)
        for item in parse_list_page(html):
            if item.profile_url not in seen_profile:
                seen_profile.add(item.profile_url)
                roster.append(item)
        time.sleep(delay_seconds)

    results: list[FacultyProfileData] = []
    total = len(roster)
    for i, item in enumerate(roster, start=1):
        if on_progress:
            on_progress("profiles", i, total)
        try:
            html = _session_get(session, item.profile_url)
            results.append(parse_profile_page(html, item.profile_url, item))
        except Exception:
            results.append(
                FacultyProfileData(
                    name=item.name,
                    designation=item.designation,
                    department=DEFAULT_DEPARTMENT,
                    profile_url=item.profile_url,
                    image_url=item.image_url,
                )
            )
        time.sleep(delay_seconds)

    return results
