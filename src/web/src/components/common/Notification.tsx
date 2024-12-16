// @mui/material version 5.x
// framer-motion version 6.x
import React, { useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import Toast from './Toast';
import useNotification from '../../hooks/useNotification';
import { NotificationPriority, DismissReason } from '../../hooks/useNotification';

// Constants for notification positioning and animations
const NOTIFICATION_POSITIONS = {
  'top-right': 'fixed top-4 right-4',
  'top-left': 'fixed top-4 left-4',
  'bottom-right': 'fixed bottom-4 right-4',
  'bottom-left': 'fixed bottom-4 left-4',
} as const;

const ANIMATION_VARIANTS = {
  container: {
    initial: {},
    animate: {
      transition: { staggerChildren: 0.1 }
    }
  },
  notification: {
    initial: { opacity: 0, y: 50, scale: 0.3 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } }
  }
};

const GESTURE_CONFIG = {
  swipeDismiss: { velocity: 50, distance: 100 },
  dragConstraints: { left: 0, right: 300 }
};

// Interface for component props
interface NotificationProps {
  /** Optional class name for container styling */
  className?: string;
  /** Position of the notification stack */
  position?: keyof typeof NOTIFICATION_POSITIONS;
  /** Custom animation configuration */
  animationConfig?: typeof ANIMATION_VARIANTS;
  /** Enable gesture-based interactions */
  enableGestures?: boolean;
}

/**
 * Enhanced notification container component that manages multiple toast notifications
 * with animations, accessibility features, and gesture support.
 */
const Notification: React.FC<NotificationProps> = ({
  className = '',
  position = 'bottom-right',
  animationConfig = ANIMATION_VARIANTS,
  enableGestures = true
}) => {
  const { notifications, hideNotification } = useNotification();
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle notification cleanup on unmount
  useEffect(() => {
    return () => {
      notifications.forEach(notification => {
        hideNotification(notification.id, DismissReason.CLEANUP);
      });
    };
  }, []);

  // Handle gesture-based dismissal
  const handleDragEnd = useCallback((
    notificationId: string,
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { velocity, offset } = info;
    if (
      Math.abs(velocity.x) > GESTURE_CONFIG.swipeDismiss.velocity ||
      Math.abs(offset.x) > GESTURE_CONFIG.swipeDismiss.distance
    ) {
      hideNotification(notificationId, DismissReason.USER);
    }
  }, [hideNotification]);

  // Set up ARIA live region for accessibility
  useEffect(() => {
    if (!containerRef.current) return;

    const liveRegion = document.createElement('div');
    liveRegion.id = 'notification-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    containerRef.current.appendChild(liveRegion);

    return () => {
      liveRegion.remove();
    };
  }, []);

  // Performance optimization for notification rendering
  const getNotificationStyle = useCallback((index: number) => ({
    position: 'relative',
    zIndex: 1000 + index,
    marginBottom: index < notifications.length - 1 ? '1rem' : 0
  }), [notifications.length]);

  return (
    <div
      ref={containerRef}
      className={`notification-container ${NOTIFICATION_POSITIONS[position]} ${className}`}
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="sync">
        <motion.div
          variants={animationConfig.container}
          initial="initial"
          animate="animate"
          className="notification-stack"
          style={{
            position: 'fixed',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'none',
            maxWidth: '100%',
            width: '400px'
          }}
        >
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              ref={el => {
                if (el) {
                  notificationRefs.current.set(notification.id, el);
                } else {
                  notificationRefs.current.delete(notification.id);
                }
              }}
              variants={animationConfig.notification}
              layout
              drag={enableGestures ? 'x' : false}
              dragConstraints={GESTURE_CONFIG.dragConstraints}
              onDragEnd={(event, info) => handleDragEnd(notification.id, event, info)}
              style={getNotificationStyle(index)}
            >
              <Toast
                id={notification.id}
                message={notification.message}
                type={notification.type}
                duration={notification.duration}
                onClose={() => hideNotification(notification.id, DismissReason.USER)}
                position={{
                  vertical: position.startsWith('top') ? 'top' : 'bottom',
                  horizontal: position.endsWith('right') ? 'right' : 'left'
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Add display name for debugging
Notification.displayName = 'Notification';

export default Notification;