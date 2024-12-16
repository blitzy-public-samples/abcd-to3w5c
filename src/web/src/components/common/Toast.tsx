// @mui/material version 5.x
// framer-motion version 6.x
import React, { useEffect, useCallback, useRef, memo } from 'react';
import { styled } from '@mui/material/styles';
import { Alert, Snackbar } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeMode } from '../../types/theme.types';
import { useNotification } from '../../hooks/useNotification';
import { NOTIFICATION_TYPES } from '../../store/notification.slice';

// Animation variants for toast notifications
const toastVariants = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

// Styled components with theme-aware styling
const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  position: 'fixed',
  zIndex: theme.zIndex.snackbar,
  maxWidth: '90%',
  margin: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  minHeight: '44px', // WCAG touch target size
  '& .MuiSnackbarContent-root': {
    minWidth: '300px',
  },
  [theme.breakpoints.down('sm')]: {
    margin: theme.spacing(0.5),
    maxWidth: '95%',
  },
  [theme.breakpoints.up('md')]: {
    margin: theme.spacing(1),
    maxWidth: '90%',
  },
  [theme.breakpoints.up('lg')]: {
    margin: theme.spacing(2),
    maxWidth: '500px',
  }
}));

const StyledAlert = styled(Alert, {
  shouldForwardProp: (prop) => prop !== 'themeMode'
})<{ themeMode?: ThemeMode }>(({ theme, themeMode }) => ({
  minWidth: '300px',
  maxWidth: '500px',
  borderRadius: theme.shape.borderRadius,
  fontSize: '14px',
  lineHeight: 1.5,
  transform: 'translateZ(0)', // Force GPU acceleration
  willChange: 'transform, opacity',
  boxShadow: themeMode === ThemeMode.LIGHT 
    ? '0 2px 8px rgba(0,0,0,0.15)' 
    : '0 2px 8px rgba(0,0,0,0.3)',
  '& .MuiAlert-icon': {
    marginRight: theme.spacing(1),
    fontSize: '20px',
  },
  '& .MuiAlert-action': {
    padding: theme.spacing(0, 1),
    marginRight: theme.spacing(-1),
  }
}));

// Toast component props interface
interface ToastProps {
  id: string;
  message: string;
  type: keyof typeof NOTIFICATION_TYPES;
  duration?: number;
  onClose: () => void;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'right' | 'center';
  };
}

// Individual Toast component
export const Toast = memo(({
  id,
  message,
  type,
  duration = 5000,
  onClose,
  position = { vertical: 'bottom', horizontal: 'left' }
}: ToastProps) => {
  const timeoutRef = useRef<number>();

  // Handle auto-dismiss
  useEffect(() => {
    timeoutRef.current = window.setTimeout(onClose, duration);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, onClose]);

  // Determine ARIA properties based on notification type
  const getAriaProps = useCallback(() => {
    const baseProps = {
      role: 'alert',
      'aria-atomic': true,
    };

    switch (type) {
      case 'error':
        return { ...baseProps, 'aria-live': 'assertive' };
      case 'warning':
        return { ...baseProps, 'aria-live': 'polite' };
      default:
        return { ...baseProps, 'aria-live': 'polite' };
    }
  }, [type]);

  return (
    <motion.div
      layout
      initial="initial"
      animate="animate"
      exit="exit"
      variants={toastVariants}
      key={id}
    >
      <StyledSnackbar
        open={true}
        anchorOrigin={position}
        {...getAriaProps()}
      >
        <StyledAlert
          elevation={6}
          variant="filled"
          severity={type}
          onClose={onClose}
          themeMode={ThemeMode.LIGHT}
        >
          {message}
        </StyledAlert>
      </StyledSnackbar>
    </motion.div>
  );
});

Toast.displayName = 'Toast';

// Container component for managing multiple toasts
const ToastContainer: React.FC = () => {
  const { notifications, hideNotification } = useNotification();

  // Stagger animation for multiple toasts
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <AnimatePresence mode="sync">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        style={{
          position: 'fixed',
          zIndex: 1400,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            id={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => hideNotification(notification.id, 'user')}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default ToastContainer;