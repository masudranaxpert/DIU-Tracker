import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { adminTheme } from '@/shared/theme/adminTheme';

interface AdminThemeProviderProps {
  children: React.ReactNode;
}

const AdminThemeProvider: React.FC<AdminThemeProviderProps> = ({ children }) => (
  <ThemeProvider theme={adminTheme}>
    <CssBaseline enableColorScheme />
    {children}
  </ThemeProvider>
);

export default AdminThemeProvider;
