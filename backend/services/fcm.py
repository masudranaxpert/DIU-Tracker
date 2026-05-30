"""Firebase Cloud Messaging — HTTP v1 quotas, 500-token multicast, 429 retry, stale token cleanup."""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Any

_logger = logging.getLogger(__name__)
_firebase_ready = False
_cached_cred_info: dict[str, Any] | None = None

FCM_ENABLED_DEFAULT = True
# FCM HTTP v1: max 500 registration tokens per multicast
FCM_MULTICAST_LIMIT = 500
# Keep payload under 4KB (notification + data)
FCM_TITLE_MAX = 200
FCM_BODY_MAX = 240
FCM_MAX_RETRIES = 4
FCM_RETRY_BASE_SEC = 2.0


def is_fcm_enabled() -> bool:
    raw = os.environ.get("FCM_ENABLED", str(FCM_ENABLED_DEFAULT).lower())
    return raw.lower() in ("1", "true", "yes")


def _normalize_private_key(info: dict[str, Any]) -> dict[str, Any]:
    key = info.get("private_key")
    if isinstance(key, str) and "\\n" in key:
        info = {**info, "private_key": key.replace("\\n", "\n")}
    return info


def _load_service_account_info() -> dict[str, Any] | None:
    global _cached_cred_info
    if _cached_cred_info is not None:
        return _cached_cred_info

    raw_b64 = (os.environ.get("FCM_TOKEN_BASE64") or "").strip()
    if not raw_b64:
        _logger.warning("FCM disabled: set FCM_TOKEN_BASE64 in .env (base64 of Firebase service account JSON)")
        return None

    try:
        padded = raw_b64 + "=" * (-len(raw_b64) % 4)
        decoded = base64.b64decode(padded, validate=False)
        info = json.loads(decoded.decode("utf-8"))
        if not isinstance(info, dict):
            raise ValueError("decoded payload is not a JSON object")
        required = ("type", "project_id", "private_key", "client_email")
        missing = [k for k in required if not info.get(k)]
        if missing:
            raise ValueError(f"missing fields: {', '.join(missing)}")
        info = _normalize_private_key(info)
        _cached_cred_info = info
        return info
    except Exception as exc:
        _logger.error(
            "FCM_TOKEN_BASE64 invalid — encode the full Firebase service account JSON file: %s",
            exc,
        )
        return None


def _verify_service_account(info: dict[str, Any]) -> bool:
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account

        scopes = ["https://www.googleapis.com/auth/firebase.messaging"]
        creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
        creds.refresh(Request())
        _logger.info("FCM credentials OK for %s", creds.service_account_email)
        return True
    except Exception as exc:
        _logger.error(
            "FCM credentials rejected by Google — generate a NEW key in Firebase Console "
            "and update FCM_TOKEN_BASE64 (Invalid JWT = corrupt or revoked key): %s",
            exc,
        )
        return False


def ensure_firebase() -> bool:
    global _firebase_ready
    if _firebase_ready:
        return True
    if not is_fcm_enabled():
        return False

    info = _load_service_account_info()
    if not info:
        return False
    if not _verify_service_account(info):
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.Certificate(info))
        _firebase_ready = True
        return True
    except Exception as exc:
        _logger.exception("Firebase init failed: %s", exc)
        return False


def _string_data(data: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in data.items():
        if value is None:
            continue
        s = str(value)
        if len(s) > 900:
            s = s[:900]
        out[str(key)[:64]] = s
    return out


def _is_invalid_token_error(exc: BaseException | None) -> bool:
    if exc is None:
        return False
    code = (getattr(exc, "code", None) or "").upper()
    if code in ("NOT_FOUND", "INVALID_ARGUMENT", "UNREGISTERED"):
        return True
    text = str(exc).lower()
    return (
        "not registered" in text
        or "invalid-registration" in text
        or "registration-token-not-registered" in text
    )


def _is_retryable_error(exc: BaseException) -> bool:
    code = (getattr(exc, "code", None) or "").upper()
    if code in ("RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL", "DEADLINE_EXCEEDED"):
        return True
    text = str(exc).lower()
    return "429" in text or "quota" in text or "resource_exhausted" in text


def _send_multicast_once(
    chunk: list[str],
    *,
    title: str,
    body: str,
    data: dict[str, str],
    android_priority: str,
):
    from firebase_admin import messaging

    # Non-collapsible: distinct notices/records (FCM collapsible throttle does not apply)
    android_cfg = messaging.AndroidConfig(priority=android_priority)
    apns_cfg = messaging.APNSConfig(
        headers={"apns-priority": "10" if android_priority == "high" else "5"},
    )
    return messaging.send_each_for_multicast(
        messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data,
            tokens=chunk,
            android=android_cfg,
            apns=apns_cfg,
        ),
        dry_run=False,
    )


def _send_chunk(
    chunk: list[str],
    *,
    title: str,
    body: str,
    data: dict[str, str],
    high_priority: bool,
) -> tuple[int, list[str]]:
    priority = "high" if high_priority else "normal"
    invalid: list[str] = []
    sent = 0
    delay = FCM_RETRY_BASE_SEC

    for attempt in range(FCM_MAX_RETRIES):
        try:
            response = _send_multicast_once(
                chunk, title=title, body=body, data=data, android_priority=priority
            )
            for idx, item in enumerate(response.responses):
                if item.success:
                    sent += 1
                elif _is_invalid_token_error(item.exception):
                    invalid.append(chunk[idx])
                elif item.exception:
                    _logger.warning("FCM token error: %s", item.exception)
            return sent, invalid
        except Exception as exc:
            if _is_retryable_error(exc) and attempt < FCM_MAX_RETRIES - 1:
                _logger.warning(
                    "FCM quota/overload (attempt %s/%s), retry in %ss: %s",
                    attempt + 1,
                    FCM_MAX_RETRIES,
                    delay,
                    exc,
                )
                time.sleep(delay)
                delay *= 2
                continue
            _logger.exception("FCM multicast failed: %s", exc)
            return sent, invalid

    return sent, invalid


def send_push(
    tokens: list[str],
    *,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    high_priority: bool = False,
) -> tuple[int, list[str]]:
    """
    Send to many devices. Returns (success_count, invalid_fcm_tokens_to_delete).
    Respects 500 tokens/multicast and retries 429 RESOURCE_EXHAUSTED.
    """
    unique = list(dict.fromkeys(t for t in tokens if t))
    if not unique or not ensure_firebase():
        return 0, []

    safe_title = (title or "DIU Tracker")[:FCM_TITLE_MAX]
    safe_body = (body or "")[:FCM_BODY_MAX]
    payload_data = _string_data(data or {})

    total_sent = 0
    all_invalid: list[str] = []

    for i in range(0, len(unique), FCM_MULTICAST_LIMIT):
        chunk = unique[i : i + FCM_MULTICAST_LIMIT]
        sent, invalid = _send_chunk(
            chunk,
            title=safe_title,
            body=safe_body,
            data=payload_data,
            high_priority=high_priority,
        )
        total_sent += sent
        all_invalid.extend(invalid)

    return total_sent, list(dict.fromkeys(all_invalid))
