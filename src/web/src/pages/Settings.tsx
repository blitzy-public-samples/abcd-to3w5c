import React, { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Internal components
import DashboardLayout from '../layouts/DashboardLayout';
import NotificationSettings from '../components/settings/NotificationSettings';
import ProfileSettings from '../components/settings/ProfileSettings';
import ThemeSettings from '../components/settings/ThemeSettings';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { useAnalytics } from '../hooks/useAnalytics';

/**
 * Interface for tab panel props with accessibility support
 */
interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
  role?: string;
}

/**
 * Accessible TabPanel component
 */
const TabPanel: React.FC<TabPanelProps> = React.memo(({
  children,
  value,
  index,
  role = 'tabpanel'
}) => {
  return (
    <div
      role={role}
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
});

TabPanel.displayName = 'TabPanel';

/**
 * Settings page component with comprehensive settings management
 */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showNotification } = useNotification();
  const { clearCache } = useAnalytics();

  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handles tab selection changes
   */
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  }, []);

  /**
   * Handles account deletion with confirmation
   */
  const handleDeleteAccount = useCallback(async () => {
    try {
      setIsDeleting(true);
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await logout();
      showNotification({
        message: 'Account successfully deleted',
        type: 'success'
      });
      navigate('/login');
    } catch (error) {
      showNotification({
        message: 'Failed to delete account',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [logout, navigate, showNotification]);

  /**
   * Memoized tab labels for accessibility
   */
  const tabLabels = useMemo(() => [
    { label: 'Profile', ariaLabel: 'Profile settings tab' },
    { label: 'Notifications', ariaLabel: 'Notification settings tab' },
    { label: 'Theme', ariaLabel: 'Theme settings tab' },
  ], []);

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Settings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your account settings and preferences
            </Typography>
          </Box>

          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            aria-label="Settings tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {tabLabels.map((tab, index) => (
              <Tab
                key={tab.label}
                label={tab.label}
                id={`settings-tab-${index}`}
                aria-controls={`settings-tabpanel-${index}`}
                aria-label={tab.ariaLabel}
              />
            ))}
          </Tabs>

          <TabPanel value={selectedTab} index={0}>
            <ProfileSettings />
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            <NotificationSettings />
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            <ThemeSettings />
          </TabPanel>

          <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Data Management
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => clearCache()}
                aria-label="Clear application cache"
              >
                Clear Cache
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
                aria-label="Delete account permanently"
              >
                Delete Account
              </Button>
            </Box>
          </Box>
        </Container>

        {/* Delete Account Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Delete Account
          </DialogTitle>
          <DialogContent id="delete-dialog-description">
            <Typography>
              Are you sure you want to delete your account? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} /> : null}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default Settings;