import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  People,
  School,
  AccountCircle,
  Business,
  RateReview,
  CloudQueue,
  Menu as MenuIcon,
  Logout,
  Shield,
  Close,
  MenuBook,
  Quiz,
} from '@mui/icons-material';
import { useAdminTab, AdminTab } from '@/features/admin/hooks/useAdminTab';
import { adminAuthService, AdminUser } from '@/features/admin/services/adminAuthService';
import { DRAWER_WIDTH, adminColors } from '@/shared/theme/adminTheme';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Dashboard fontSize="small" /> },
  { id: 'cr_management', label: 'CR Management', icon: <People fontSize="small" /> },
  { id: 'students', label: 'Students', icon: <School fontSize="small" /> },
  { id: 'teachers', label: 'Teachers', icon: <AccountCircle fontSize="small" /> },
  { id: 'course_list', label: 'Course Catalog', icon: <MenuBook fontSize="small" /> },
  { id: 'question_bank', label: 'Question Bank', icon: <Quiz fontSize="small" /> },
  { id: 'batches', label: 'Batches', icon: <Business fontSize="small" /> },
  { id: 'feedback', label: 'Feedback', icon: <RateReview fontSize="small" /> },
  { id: 'rclone', label: 'Rclone', icon: <CloudQueue fontSize="small" /> },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { currentTab, setTab } = useAdminTab();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [adminUser] = useState<AdminUser | null>(adminAuthService.getCachedAdmin());

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleNavClick = (tab: AdminTab) => {
    setTab(tab);
    if (!isDesktop) setMobileOpen(false);
  };

  const handleLogout = async () => {
    await adminAuthService.logout();
    window.location.href = '/admin-login';
  };

  const currentLabel = menuItems.find((m) => m.id === currentTab)?.label || 'Dashboard';

  const drawerContent = (
    <Box
      sx={{
        bgcolor: adminColors.sidebar,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${adminColors.sidebarBorder}`,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: adminColors.sidebarTextActive,
                fontWeight: 700,
                fontSize: '0.95rem',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
              noWrap
            >
              DIU Tracker
            </Typography>
            <Typography sx={{ color: adminColors.sidebarText, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Super Admin
            </Typography>
          </Box>
        </Box>
        {!isDesktop && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: adminColors.sidebarText }} aria-label="Close menu" size="small">
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: adminColors.sidebarBorder }} />

      <List sx={{ px: 1.25, py: 1.5, flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const selected = currentTab === item.id;
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavClick(item.id)}
                selected={selected}
                sx={{
                  borderRadius: '8px',
                  py: 1.1,
                  px: 1.25,
                  position: 'relative',
                  '&.Mui-selected': {
                    bgcolor: adminColors.sidebarActive,
                    '&:hover': { bgcolor: adminColors.sidebarActive },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: 3,
                      borderRadius: '0 2px 2px 0',
                      bgcolor: adminColors.sidebarActiveBorder,
                    },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  '& .MuiListItemIcon-root': {
                    color: selected ? '#a5b4fc' : adminColors.sidebarText,
                    minWidth: 36,
                  },
                  '& .MuiListItemText-primary': {
                    color: selected ? adminColors.sidebarTextActive : adminColors.sidebarText,
                    fontWeight: selected ? 600 : 500,
                    fontSize: '0.8125rem',
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 1.5, borderTop: `1px solid ${adminColors.sidebarBorder}` }}>
        <Typography sx={{ fontSize: '0.65rem', color: adminColors.sidebarText, textAlign: 'center', fontWeight: 500 }}>
          Section control · Batches · CR approval
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', width: '100%' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, sm: 2.5 }, minHeight: { xs: 56, sm: 60 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { md: 'none' } }}
            aria-label="Open menu"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, letterSpacing: '-0.02em' }}>
              {currentLabel}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
              DIU CSE Academic Tracker — Administration
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              noWrap
              sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' }, maxWidth: 200, fontWeight: 500 }}
            >
              {adminUser?.full_name || adminUser?.email || 'Admin'}
            </Typography>
            <IconButton onClick={handleMenuOpen} aria-label="Account menu" size="small">
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 36,
                  height: 36,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {(adminUser?.full_name?.[0] || adminUser?.email?.[0] || 'A').toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{ paper: { sx: { borderRadius: '10px', minWidth: 200, mt: 0.5 } } }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                {adminUser?.email}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main', py: 1.25 }}>
              <ListItemIcon>
                <Logout fontSize="small" color="error" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }} aria-label="Admin navigation">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 60 } }} />
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 1.5, sm: 2, md: 2.5 },
            width: '100%',
            maxWidth: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 1200 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
