import React, { useCallback, useEffect, useRef } from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import Button from './Button';
import Modal from './Modal';
import { ThemeMode } from '../../types/theme.types';

// Dialog size configuration with responsive values
const DIALOG_SIZES = {
  small: '320px',
  medium: '480px',
  large: '640px',
  fullscreen: '100%'
} as const;

// Animation duration for transitions
const ANIMATION_DURATION = 200;

// Default values for dialog configuration
const DEFAULT_DIALOG_SIZE = 'medium';
const DEFAULT_CONFIRM_TEXT = 'Confirm';
const DEFAULT_CANCEL_TEXT = 'Cancel';

type DialogSize = keyof typeof DIALOG_SIZES;

/**
 * Props interface for Dialog component with comprehensive accessibility and customization options
 */
interface DialogProps {
  /** Dialog title displayed in the header */
  title: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Controls dialog visibility */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Size variant of the dialog */
  size?: DialogSize;
  /** Text for confirm button */
  confirmText?: string;
  /** Text for cancel button */
  cancelText?: string;
  /** Callback when confirm button is clicked */
  onConfirm?: () => void;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** ID of element describing dialog content */
  ariaDescribedBy?: string;
  /** Whether clicking backdrop closes dialog */
  disableBackdropClick?: boolean;
  /** Whether escape key closes dialog */
  disableEscapeKey?: boolean;
  /** Theme mode for styling */
  theme?: ThemeMode;
}

/**
 * Helper function to generate dialog footer with action buttons
 */
const getDialogFooter = (props: DialogProps) => {
  const {
    showActions,
    confirmText = DEFAULT_CONFIRM_TEXT,
    cancelText = DEFAULT_CANCEL_TEXT,
    onConfirm,
    onCancel,
    theme
  } = props;

  if (!showActions) return null;

  return (
    <div
      className={classNames('dialog-footer', {
        'dialog-footer--dark': theme === ThemeMode.DARK
      })}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem',
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border-color)'
      }}
    >
      <Button
        variant="text"
        size="medium"
        onClick={onCancel}
        ariaLabel={cancelText}
      >
        {cancelText}
      </Button>
      <Button
        variant="primary"
        size="medium"
        onClick={onConfirm}
        ariaLabel={confirmText}
      >
        {confirmText}
      </Button>
    </div>
  );
};

/**
 * Dialog component implementing Material Design dialog patterns with comprehensive
 * accessibility support and responsive behavior.
 */
const Dialog: React.FC<DialogProps> = ({
  title,
  children,
  isOpen,
  onClose,
  size = DEFAULT_DIALOG_SIZE,
  confirmText = DEFAULT_CONFIRM_TEXT,
  cancelText = DEFAULT_CANCEL_TEXT,
  onConfirm,
  onCancel,
  showActions = true,
  className,
  ariaLabel,
  ariaDescribedBy,
  disableBackdropClick = false,
  disableEscapeKey = false,
  theme = ThemeMode.LIGHT
}) => {
  // Reference to track previous active element for focus restoration
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store active element when dialog opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else {
      // Restore focus when dialog closes
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key press
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!disableEscapeKey && event.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [disableEscapeKey, isOpen, onClose]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (!disableBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [disableBackdropClick, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size as 'small' | 'medium' | 'large'}
      closeOnOverlayClick={!disableBackdropClick}
      ariaLabel={ariaLabel || title}
      ariaDescribedBy={ariaDescribedBy}
      className={classNames('dialog', className, {
        'dialog--dark': theme === ThemeMode.DARK
      })}
      testId="dialog"
    >
      <div
        className="dialog-content"
        style={{
          padding: '1.5rem',
          maxHeight: `calc(100vh - ${showActions ? '180px' : '120px'})`,
          overflowY: 'auto'
        }}
      >
        {children}
      </div>
      {getDialogFooter({
        showActions,
        confirmText,
        cancelText,
        onConfirm,
        onCancel,
        theme
      })}
    </Modal>
  );
};

// Set display name for better debugging
Dialog.displayName = 'Dialog';

export default Dialog;