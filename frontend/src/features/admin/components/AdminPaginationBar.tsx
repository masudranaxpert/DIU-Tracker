import React from 'react';
import { Box, Button, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  rangeStart?: number;
  rangeEnd?: number;
  onPageChange: (page: number) => void;
}

const AdminPaginationBar: React.FC<Props> = ({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (total === 0) return null;

  const start = rangeStart ?? (total === 0 ? 0 : (page - 1) * 1 + 1);
  const end = rangeEnd ?? Math.min(page * 1, total);

  const windowPages: number[] = [];
  const w = isMobile ? 1 : 2;
  for (let p = Math.max(1, page - w); p <= Math.min(totalPages, page + w); p++) {
    windowPages.push(p);
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.25, sm: 1.5 },
        borderTop: '1px solid',
        borderColor: 'divider',
        gap: 1.5,
        bgcolor: { xs: 'grey.50', sm: 'transparent' },
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textAlign: { xs: 'center', sm: 'left' } }}
      >
        {rangeStart != null && rangeEnd != null
          ? `${rangeStart}–${rangeEnd} of ${total}`
          : `${total} total · Page ${page} of ${totalPages}`}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
        }}
      >
        <IconButton
          size={isMobile ? 'medium' : 'small'}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
        >
          <ChevronLeft fontSize="small" />
        </IconButton>
        {windowPages.map((p) => (
          <Button
            key={p}
            size="small"
            variant={p === page ? 'contained' : 'outlined'}
            onClick={() => onPageChange(p)}
            sx={{
              minWidth: { xs: 40, sm: 36 },
              minHeight: { xs: 40, sm: 32 },
              px: 1,
              fontWeight: 700,
              borderRadius: '8px',
            }}
          >
            {p}
          </Button>
        ))}
        <IconButton
          size={isMobile ? 'medium' : 'small'}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default AdminPaginationBar;
