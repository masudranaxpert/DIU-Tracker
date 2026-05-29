"""Google OAuth2 + Drive quota helpers."""
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_DRIVE_ABOUT_URL = "https://www.googleapis.com/drive/v3/about?fields=storageQuota,user"
DRIVE_SCOPE = "https://www.googleapis.com/auth/drive"


def build_authorization_url(client_id: str, redirect_uri: str, state: Optional[str] = None) -> str:
    params = {
        "client_id": client_id.strip(),
        "redirect_uri": redirect_uri.strip(),
        "response_type": "code",
        "scope": DRIVE_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def extract_code_from_redirect(redirect_input: str) -> str:
    raw = redirect_input.strip()
    if not raw:
        raise ValueError("Redirect URL or code is empty")
    if not raw.startswith("http"):
        return raw
    parsed = urllib.parse.urlparse(raw)
    qs = urllib.parse.parse_qs(parsed.query)
    if "error" in qs:
        err = qs.get("error_description", qs["error"])[0]
        raise ValueError(f"Google OAuth error: {err}")
    codes = qs.get("code")
    if not codes or not codes[0]:
        raise ValueError("No authorization code found in the pasted URL")
    return codes[0]


def _post_token_request(body: dict[str, str]) -> dict[str, Any]:
    data = urllib.parse.urlencode(body).encode("utf-8")
    req = urllib.request.Request(GOOGLE_TOKEN_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(detail)
            msg = err_json.get("error_description") or err_json.get("error") or detail
        except json.JSONDecodeError:
            msg = detail
        raise ValueError(str(msg)) from exc


def exchange_authorization_code(
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    code: str,
) -> dict[str, Any]:
    return _post_token_request(
        {
            "code": code,
            "client_id": client_id.strip(),
            "client_secret": client_secret.strip(),
            "redirect_uri": redirect_uri.strip(),
            "grant_type": "authorization_code",
        }
    )


def refresh_access_token(client_id: str, client_secret: str, refresh_token: str) -> dict[str, Any]:
    return _post_token_request(
        {
            "client_id": client_id.strip(),
            "client_secret": client_secret.strip(),
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    )


def fetch_google_account_email(access_token: str) -> str | None:
    req = urllib.request.Request(GOOGLE_USERINFO_URL)
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("email")
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError):
        return None


def fetch_drive_quota(access_token: str) -> dict[str, Any]:
    req = urllib.request.Request(GOOGLE_DRIVE_ABOUT_URL)
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        if exc.code == 403:
            raise ValueError(
                "Google Drive quota API returned 403. Enable the Drive API in Google Cloud Console "
                "for this OAuth client, and ensure the account has Drive access."
            ) from exc
        raise ValueError(f"Could not read Drive quota (HTTP {exc.code}): {detail[:200]}") from exc
    except urllib.error.URLError as exc:
        raise ValueError(f"Network error checking Drive quota: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid response from Google Drive quota API.") from exc

    sq = data.get("storageQuota") or {}
    limit = int(sq["limit"]) if sq.get("limit") else None
    usage = int(sq["usage"]) if sq.get("usage") else 0
    usage_drive = int(sq["usageInDrive"]) if sq.get("usageInDrive") else None
    return {
        "limit_bytes": limit,
        "usage_bytes": usage,
        "usage_in_drive_bytes": usage_drive,
        "user_email": (data.get("user") or {}).get("emailAddress"),
    }


def bytes_to_gb(value: Optional[int]) -> Optional[float]:
    if value is None:
        return None
    return round(value / (1024**3), 2)
