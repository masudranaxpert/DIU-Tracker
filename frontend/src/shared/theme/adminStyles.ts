/** Hide table column below sm breakpoint */
export const cellHiddenXs = { display: { xs: 'none', sm: 'table-cell' } };

/** Hide table column below md breakpoint */
export const cellHiddenSm = { display: { xs: 'none', md: 'table-cell' } };

export const tableContainerSx = {
  maxWidth: '100%',
  overflowX: 'auto' as const,
  WebkitOverflowScrolling: 'touch' as const,
};

export const adminCardSx = {
  borderRadius: '10px',
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

export const pageHeaderSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', sm: 'center' },
  mb: 2.5,
  flexDirection: { xs: 'column', sm: 'row' } as const,
  gap: { xs: 1.5, sm: 0 },
};

export const pageTitleSx = {
  fontWeight: 700,
  color: 'text.primary',
  fontSize: { xs: '1.125rem', sm: '1.25rem' },
  letterSpacing: '-0.02em',
};

export const sectionHeaderSx = {
  p: { xs: 1.5, sm: 2 },
  pb: 1.5,
  borderBottom: '1px solid',
  borderColor: 'divider',
  bgcolor: '#f8fafc',
};

export const emptyStateSx = {
  py: 5,
  px: 2,
  textAlign: 'center' as const,
  color: 'text.secondary',
};
