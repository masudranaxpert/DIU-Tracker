from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from bs4 import BeautifulSoup


@dataclass
class QbFilterOption:
    id: int
    name: str
    short_name: Optional[str] = None


@dataclass
class QbQuestionRow:
    id: int
    department: QbFilterOption
    course: QbFilterOption
    semester: QbFilterOption
    exam_type: QbFilterOption
    submissions_count: int
    created_at: Optional[datetime]


@dataclass
class QbSubmissionRow:
    id: int
    user: dict[str, Any]
    pdf_url: str
    section: Optional[str]
    vote_score: int
    views: int
    created_at: Optional[datetime]


def _parse_inertia_page(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    app = soup.find(id="app")
    if not app:
        raise ValueError("Inertia container (#app) not found")
    data_page = app.get("data-page")
    if not data_page:
        raise ValueError("Missing data-page on #app")
    return json.loads(data_page)


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    # diuqbank uses ISO with Z suffix; datetime.fromisoformat doesn't like Z
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except Exception:
        return None


def scrape_questions_index(html: str) -> tuple[list[QbQuestionRow], dict[str, list[QbFilterOption]], dict[str, Any]]:
    page = _parse_inertia_page(html)
    props = page.get("props") or {}

    questions_payload = (props.get("questions") or {})
    questions_data = questions_payload.get("data") or []

    filter_options = props.get("filterOptions") or {}
    departments = [
        QbFilterOption(
            id=int(d["id"]),
            name=str(d.get("name") or ""),
            short_name=str(d.get("short_name") or "") or None,
        )
        for d in (filter_options.get("departments") or [])
        if d and d.get("id") is not None
    ]
    semesters = [
        QbFilterOption(id=int(s["id"]), name=str(s.get("name") or ""))
        for s in (filter_options.get("semesters") or [])
        if s and s.get("id") is not None
    ]
    courses = [
        QbFilterOption(id=int(c["id"]), name=str(c.get("name") or ""))
        for c in (filter_options.get("courses") or [])
        if c and c.get("id") is not None
    ]
    exam_types = [
        QbFilterOption(id=int(e["id"]), name=str(e.get("name") or ""))
        for e in (filter_options.get("examTypes") or [])
        if e and e.get("id") is not None
    ]

    def _opt(obj: dict[str, Any]) -> QbFilterOption:
        return QbFilterOption(
            id=int(obj["id"]),
            name=str(obj.get("name") or ""),
            short_name=str(obj.get("short_name") or "") or None,
        )

    out: list[QbQuestionRow] = []
    for q in questions_data:
        if not q or q.get("id") is None:
            continue
        out.append(
            QbQuestionRow(
                id=int(q["id"]),
                department=_opt(q["department"]) if q.get("department") else QbFilterOption(id=0, name=""),
                course=_opt(q["course"]) if q.get("course") else QbFilterOption(id=0, name=""),
                semester=_opt(q["semester"]) if q.get("semester") else QbFilterOption(id=0, name=""),
                exam_type=_opt(q["exam_type"]) if q.get("exam_type") else QbFilterOption(id=0, name=""),
                submissions_count=int(q.get("submissions_count") or 0),
                created_at=_parse_dt(q.get("created_at")),
            )
        )

    filters = {"departments": departments, "semesters": semesters, "courses": courses, "examTypes": exam_types}
    meta = questions_payload.get("meta") or {}
    return out, filters, meta


def scrape_question_show(html: str) -> tuple[dict[str, Any], list[QbSubmissionRow]]:
    page = _parse_inertia_page(html)
    props = page.get("props") or {}
    question = props.get("question") or {}
    submissions = props.get("submissions") or []
    out_subs: list[QbSubmissionRow] = []
    for s in submissions:
        if not s or s.get("id") is None:
            continue
        out_subs.append(
            QbSubmissionRow(
                id=int(s["id"]),
                user=s.get("user") or {},
                pdf_url=str(s.get("pdf_url") or ""),
                section=s.get("section"),
                vote_score=int(s.get("vote_score") or 0),
                views=int(s.get("views") or 0),
                created_at=_parse_dt(s.get("created_at")),
            )
        )
    return question, out_subs

