"""Upload files to Google Drive using stored OAuth tokens."""
import json
import mimetypes
import re
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
FOLDER_NAME = "DIU-Tracker-Attachments"
MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB

_folder_cache: dict[str, str] = {}


def _is_rate_limit_error(raw: str) -> bool:
    lower = (raw or "").lower()
    return (
        "ratelimitexceeded" in lower.replace(" ", "")
        or "rate limit" in lower
        or "too many requests" in lower
        or ("quota exceeded" in lower and ("per minute" in lower or "queries" in lower or "write" in lower))
        or "user rate limit" in lower
    )


def friendly_drive_error(raw: str) -> str:
    lower = (raw or "").lower()
    if _is_rate_limit_error(raw):
        return "Upload service is busy. Please wait a minute and try again."
    if "storage" in lower and ("full" in lower or "quota" in lower) and "per minute" not in lower:
        return "Google Drive storage is full. Please contact your super admin."
    if "invalid_grant" in lower or "token" in lower and "expired" in lower:
        return "Drive connection expired. Please contact your super admin to re-setup Rclone."
    if len(raw) > 120 or "googleapis" in lower:
        return "Upload failed. Please try again later or contact your admin."
    return raw or "Google Drive operation failed."


def extract_drive_file_id(url_or_id: Optional[str]) -> Optional[str]:
    if not url_or_id or not str(url_or_id).strip():
        return None
    s = str(url_or_id).strip()
    if re.fullmatch(r"[a-zA-Z0-9_-]{10,}", s) and "/" not in s:
        return s
    m = re.search(r"/file/d/([a-zA-Z0-9_-]+)", s)
    if m:
        return m.group(1)
    m = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", s)
    if m:
        return m.group(1)
    return None


def _guess_mime(filename: str, fallback: str = "application/octet-stream") -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or fallback


def _http_json(
    method: str,
    url: str,
    access_token: str,
    body: Optional[dict] = None,
    extra_headers: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    data = None
    headers = {"Authorization": f"Bearer {access_token}"}
    if extra_headers:
        headers.update(extra_headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        try:
            err = json.loads(detail)
            msg = err.get("error", {}).get("message") or detail
        except json.JSONDecodeError:
            msg = detail
        if method == "DELETE" and exc.code in (404, 410):
            return {}
        raise ValueError(msg) from exc


def _find_or_create_folder(access_token: str, cache_key: str = "default") -> str:
    if cache_key in _folder_cache:
        return _folder_cache[cache_key]
    q = urllib.parse.urlencode(
        {
            "q": f"name='{FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            "fields": "files(id)",
            "pageSize": "1",
        }
    )
    listed = _http_json("GET", f"{DRIVE_FILES_URL}?{q}", access_token)
    files = listed.get("files") or []
    if files:
        _folder_cache[cache_key] = files[0]["id"]
        return files[0]["id"]
    created = _http_json(
        "POST",
        DRIVE_FILES_URL,
        access_token,
        {
            "name": FOLDER_NAME,
            "mimeType": "application/vnd.google-apps.folder",
        },
    )
    _folder_cache[cache_key] = created["id"]
    return created["id"]


def delete_drive_file(access_token: str, file_id: str) -> str:
    """
    Permanently delete a Drive file.
    Returns 'deleted' on success, 'not_found' if this account cannot see the file
    (try another connected account — file may belong elsewhere).
    """
    safe_id = urllib.parse.quote(file_id, safe="")
    try:
        _http_json("DELETE", f"{DRIVE_FILES_URL}/{safe_id}", access_token)
        return "deleted"
    except ValueError as exc:
        msg = str(exc).lower()
        if "not found" in msg or "404" in msg:
            return "not_found"
        raise


def delete_drive_file_with_retry(access_token: str, file_id: str) -> str:
    last: Optional[ValueError] = None
    for attempt in range(3):
        try:
            return delete_drive_file(access_token, file_id)
        except ValueError as exc:
            last = exc
            if attempt < 2 and _is_rate_limit_error(str(exc)):
                time.sleep(2.0 * (attempt + 1))
                continue
            raise
    if last:
        raise last
    return "not_found"


def _make_file_public(access_token: str, file_id: str) -> None:
    _http_json(
        "POST",
        f"{DRIVE_FILES_URL}/{file_id}/permissions",
        access_token,
        {"role": "reader", "type": "anyone"},
    )


def upload_bytes_to_drive(
    access_token: str,
    filename: str,
    content: bytes,
    mime_type: Optional[str] = None,
    account_cache_key: str = "default",
) -> dict[str, Any]:
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValueError(f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")

    mime = mime_type or _guess_mime(filename)
    folder_id = _find_or_create_folder(access_token, account_cache_key)
    safe_name = filename or f"upload-{uuid.uuid4().hex}"
    metadata = {
        "name": safe_name,
        "parents": [folder_id],
    }

    boundary = f"upload_boundary_{uuid.uuid4().hex}"
    meta_part = json.dumps(metadata).encode("utf-8")
    body = (
        f"--{boundary}\r\n"
        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
    ).encode("utf-8") + meta_part + (
        f"\r\n--{boundary}\r\n"
        f"Content-Type: {mime}\r\n\r\n"
    ).encode("utf-8") + content + f"\r\n--{boundary}--\r\n".encode("utf-8")

    url = f"{DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink,webContentLink,mimeType"
    upload_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": f"multipart/related; boundary={boundary}",
    }
    result: dict[str, Any] = {}
    for attempt in range(4):
        req = urllib.request.Request(url, data=body, method="POST", headers=upload_headers)
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if attempt < 3 and _is_rate_limit_error(detail):
                time.sleep(1.5 * (attempt + 1))
                continue
            raise ValueError(detail or "Google Drive upload failed") from exc

    file_id = result.get("id")
    if file_id:
        try:
            _make_file_public(access_token, file_id)
        except ValueError:
            pass

    url_out = result.get("webViewLink") or result.get("webContentLink")
    if not url_out and file_id:
        url_out = f"https://drive.google.com/file/d/{file_id}/view"

    return {
        "file_id": file_id,
        "url": url_out,
        "mime_type": result.get("mimeType") or mime,
    }


def mime_to_attachment_type(mime: str, filename: str) -> str:
    lower = (mime or "").lower()
    ext = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    if "pdf" in lower or ext == "pdf":
        return "pdf"
    if "word" in lower or ext in ("doc", "docx"):
        return "word"
    if "sheet" in lower or "excel" in lower or ext in ("xls", "xlsx"):
        return "excel"
    if "presentation" in lower or ext in ("ppt", "pptx"):
        return "pptx"
    if lower.startswith("image/"):
        return "image"
    if lower.startswith("video/"):
        return "video"
    if "zip" in lower or ext in ("zip", "rar", "7z"):
        return "zip"
    return "other"
