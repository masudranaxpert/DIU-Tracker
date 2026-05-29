"""Parse calendar-events JSON block embedded in academic calendar markdown."""
from __future__ import annotations

import json
import re
from typing import Any, List

CALENDAR_EVENTS_PATTERN = re.compile(
    r"```calendar-events\s*\n([\s\S]*?)\n```",
    re.IGNORECASE,
)


def strip_events_block(markdown: str) -> str:
    return CALENDAR_EVENTS_PATTERN.sub("", markdown or "").strip()


def parse_calendar_events(markdown: str) -> List[dict[str, Any]]:
    match = CALENDAR_EVENTS_PATTERN.search(markdown or "")
    if not match:
        return []
    raw = match.group(1).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    events: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        start = str(item.get("start") or "").strip()
        if not title or not start:
            continue
        event_id = str(item.get("id") or f"{start}-{title.lower().replace(' ', '-')[:40]}")
        end = str(item.get("end") or start).strip()
        events.append(
            {
                "id": event_id,
                "title": title,
                "start": start,
                "end": end,
                "type": str(item.get("type") or "other").strip().lower(),
                "semester": (str(item.get("semester")).strip().lower() if item.get("semester") else None),
            }
        )
    return events
