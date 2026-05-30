export const ACADEMIC_CALENDAR_AI_PROMPT = `You are helping digitize the official DIU (Daffodil International University) Academic Calendar from an uploaded image or PDF.

## Your task
1. Read EVERY row and date from the source document accurately.
2. Output a clean, student-friendly **Markdown document**.
3. At the very end, append a machine-readable events block (required).

## Markdown rules
- Start with a title: \`# Academic Calendar – [Year] ([Tri-Semester / format from source])\`
- Add a short intro line (university name, campus if visible).
- Group content by semester (Spring, Summer, Fall) using \`## Spring – [Year]\` style headings.
- Use a **Markdown table** per semester with columns: **Event** | **Dates**
- Preserve exact dates from the source. Use formats like \`03 January 2026\` or ranges \`22 February – 28 February 2026\`.
- If a cell shows \`--\` or is blank for a semester, write \`—\` in the table.
- Add footnotes section if the source has asterisk notes (e.g. moon sighting, schedule may change).
- Footnotes format (required when events have *):
\`\`\`
## Footnotes

* Eid-Ul-Adha and Eid-Ul-Fitr vacation dates are subject to moon sighting and may change accordingly.
\`\`\`
- Do NOT write meta-commentary about missing notes — use the standard moon-sighting footnote above when Eid events are marked with *.
- Do NOT invent dates that are not in the source.

## Event types (for the JSON block)
Use one of: registration, orientation, classes_start, mid_exam, final_exam, exam, holiday, vacation, break, results, grade_submission, semester_break, other

## REQUIRED: calendar-events JSON block
After all markdown content, append exactly this fenced block with parsed events:

\`\`\`calendar-events
[
  {
    "id": "spring-mid-exam-2026",
    "title": "Mid-Examination",
    "start": "2026-02-22",
    "end": "2026-02-28",
    "type": "mid_exam",
    "semester": "spring"
  }
]
\`\`\`

### JSON rules
- \`start\` and \`end\` must be ISO \`YYYY-MM-DD\`.
- Single-day events: set \`end\` same as \`start\` or omit \`end\`.
- Include **every dated event** from all semesters.
- \`id\`: lowercase slug, unique (e.g. \`summer-eid-vacation-2026\`).
- \`semester\`: spring | summer | fall (lowercase).
- \`title\`: short label matching the official event name.

## Output
Return ONLY the markdown document + the calendar-events block. No extra commentary before or after.`;

export const ACADEMIC_CALENDAR_PROMPT_STEPS = [
  'Upload the official academic calendar image/PDF to ChatGPT, Claude, or Gemini.',
  'Copy the prompt below and paste it into the same chat.',
  'Copy the AI\'s full markdown response.',
  'Paste it into the "Save markdown" box here and click Save.',
];
