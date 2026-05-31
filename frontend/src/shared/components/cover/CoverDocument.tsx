import React, { forwardRef } from 'react';
import {
  COVER_ASSETS,
  COVER_FOOTER,
  UNIVERSITY_NAME,
  type CoverData,
  formatCoverDate,
  getCoverKindInfo,
} from '@/shared/services/coverPage/coverTypes';

export const COVER_DOC_WIDTH = 794;
export const COVER_DOC_HEIGHT = 1123;

const INK = '#111827';
const NAVY = '#1e408a';
const MUTED = '#9aa3b2';
const LINE = '#d6dbe5';
const FONT = "'Segoe UI', Roboto, Arial, sans-serif";

interface CoverDocumentProps {
  data: CoverData;
}

const LV: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ fontSize: 17.5, lineHeight: 1.7, color: INK }}>
    <span style={{ fontWeight: 700 }}>{label}:</span> <span style={{ fontWeight: 400 }}>{value || ''}</span>
  </div>
);

const Bold: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 17.5, lineHeight: 1.7, color: INK, fontWeight: 700 }}>{children}</div>
);

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      textAlign: 'center',
      fontWeight: 800,
      fontSize: 19,
      color: INK,
      textDecoration: 'underline',
      textUnderlineOffset: 6,
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);

const CoverDocument = forwardRef<HTMLDivElement, CoverDocumentProps>(({ data }, ref) => {
  const info = getCoverKindInfo(data.kind);
  const isIndex = data.kind === 'index';

  return (
    <div
      ref={ref}
      style={{
        width: COVER_DOC_WIDTH,
        height: COVER_DOC_HEIGHT,
        position: 'relative',
        background: '#ffffff',
        color: INK,
        fontFamily: FONT,
        overflow: 'hidden',
      }}
    >
      <img
        src={COVER_ASSETS.watermark}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          left: (COVER_DOC_WIDTH - 360) / 2,
          top: (COVER_DOC_HEIGHT - 360) / 2 - 20,
          opacity: 0.08,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', top: 24, left: 24, width: COVER_DOC_WIDTH - 48, height: COVER_DOC_HEIGHT - 48, border: `1px solid ${INK}`, borderRadius: 4 }} />

      <div
        style={{
          position: 'relative',
          height: '100%',
          boxSizing: 'border-box',
          padding: '48px 72px 30px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <img
          src={COVER_ASSETS.header}
          alt="Daffodil International University"
          crossOrigin="anonymous"
          style={{ width: 500, display: 'block', margin: '0 auto' }}
        />

        <div
          style={{
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 27,
            color: INK,
            marginTop: 26,
            textDecoration: 'underline',
            textUnderlineOffset: 7,
            letterSpacing: 1,
          }}
        >
          {info.title}
        </div>

        <div style={{ marginTop: 30 }}>
          <LV label="Course Code" value={data.courseCode} />
          <LV label="Course Title" value={data.courseTitle} />
          {info.workNoLabel && <LV label={info.workNoLabel} value={data.workNo} />}
          {info.workTitleLabel && <LV label={info.workTitleLabel} value={data.workTitle} />}
        </div>

        {isIndex ? (
          <div style={{ marginTop: 30, flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5, color: INK }}>
              <thead>
                <tr style={{ background: NAVY, color: '#ffffff' }}>
                  <th style={{ padding: 8, textAlign: 'left', width: 48 }}>No</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Experiment Name</th>
                  <th style={{ padding: 8, textAlign: 'left', width: 110 }}>Date</th>
                  <th style={{ padding: 8, textAlign: 'left', width: 130 }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.experiments.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: 7, border: `1px solid ${LINE}`, textAlign: 'center' }}>{row.no || i + 1}</td>
                    <td style={{ padding: 7, border: `1px solid ${LINE}` }}>{row.name || ''}</td>
                    <td style={{ padding: 7, border: `1px solid ${LINE}` }}>{formatCoverDate(row.date) || ''}</td>
                    <td style={{ padding: 7, border: `1px solid ${LINE}` }}>{row.remarks || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div style={{ marginTop: 42 }}>
              <Heading>Submitted To</Heading>
              <LV label="Name" value={data.submittedTo.name} />
              <LV label="Designation" value={data.submittedTo.designation} />
              <Bold>Department of {data.submittedTo.department || '—'}</Bold>
              <Bold>{UNIVERSITY_NAME}</Bold>
            </div>

            <div style={{ marginTop: 32 }}>
              <Heading>Submitted By</Heading>
              <LV label="Name" value={data.submittedBy.name} />
              <LV label="ID" value={data.submittedBy.studentId} />
              <LV label="Section" value={data.submittedBy.section} />
              <LV label="Semester" value={data.submittedBy.semester} />
              <Bold>Department of {data.submittedBy.department || '—'}</Bold>
              <Bold>{UNIVERSITY_NAME}</Bold>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'center' }}>
              <span
                style={{
                  border: `1.5px solid ${NAVY}`,
                  borderRadius: 999,
                  padding: '9px 22px',
                  fontWeight: 700,
                  fontSize: 16.5,
                  color: INK,
                }}
              >
                Date of Submission: {formatCoverDate(data.dateOfSubmission) || '—'}
              </span>
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: 10.5, color: MUTED, marginTop: 14 }}>{COVER_FOOTER}</div>
      </div>
    </div>
  );
});

CoverDocument.displayName = 'CoverDocument';

export default CoverDocument;
