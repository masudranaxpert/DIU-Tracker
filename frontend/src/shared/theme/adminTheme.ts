import { createTheme } from '@mui/material/styles';

export const DRAWER_WIDTH = 248;

export const adminColors = {
  sidebar: '#0f172a',
  sidebarBorder: 'rgba(148, 163, 184, 0.12)',
  sidebarText: '#94a3b8',
  sidebarTextActive: '#f8fafc',
  sidebarActive: 'rgba(99, 102, 241, 0.18)',
  sidebarActiveBorder: '#6366f1',
  pageBg: '#f1f5f9',
  paper: '#ffffff',
};

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4f46e5',
      dark: '#4338ca',
      light: '#6366f1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
    },
    background: {
      default: adminColors.pageBg,
      paper: adminColors.paper,
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
    error: { main: '#dc2626' },
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
  },
  typography: {
    fontFamily: '"Roboto", system-ui, sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          overflowX: 'hidden',
          backgroundColor: adminColors.pageBg,
          fontFamily: '"Roboto", system-ui, sans-serif',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          '&:hover': { boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 10 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': { borderRadius: 8 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#64748b',
          backgroundColor: '#f8fafc',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 12,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { border: 'none' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});
