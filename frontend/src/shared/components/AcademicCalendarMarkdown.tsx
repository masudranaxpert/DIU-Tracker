import React, { useMemo } from 'react';
import { stripEventsBlock } from '@/shared/lib/academicCalendarUtils';

interface Props {
  markdown: string;
  className?: string;
}

/** Lightweight markdown renderer for academic calendar (tables, headings, lists). */
const AcademicCalendarMarkdown: React.FC<Props> = ({ markdown, className = '' }) => {
  const html = useMemo(() => renderMarkdown(stripEventsBlock(markdown)), [markdown]);

  return (
    <article
      className={`academic-calendar-md prose prose-slate dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let inCode = false;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      i += 1;
      continue;
    }
    if (inCode) {
      i += 1;
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      out.push(`<${tag}>${inlineFormat(line.replace(/^#+\s*/, ''))}</${tag}>`);
      i += 1;
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    if (/^[-*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^[-*]\s*/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^\d+\.\s*/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push('<hr />');
      i += 1;
      continue;
    }

    out.push(`<p>${inlineFormat(line.trim())}</p>`);
    i += 1;
  }

  return out.join('\n');
}

function renderTable(rows: string[]): string {
  if (rows.length === 0) return '';
  const parseRow = (row: string) =>
    row
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const header = parseRow(rows[0]);
  let bodyStart = 1;
  if (rows[1] && /^[\|\s:-]+$/.test(rows[1])) bodyStart = 2;

  const thead = `<thead><tr>${header.map((c) => `<th>${inlineFormat(c)}</th>`).join('')}</tr></thead>`;
  const tbody = rows
    .slice(bodyStart)
    .map((row) => {
      const cells = parseRow(row);
      return `<tr>${cells.map((c) => `<td>${inlineFormat(c)}</td>`).join('')}</tr>`;
    })
    .join('');

  return `<div class="table-wrap"><table>${thead}<tbody>${tbody}</tbody></table></div>`;
}

export default AcademicCalendarMarkdown;
