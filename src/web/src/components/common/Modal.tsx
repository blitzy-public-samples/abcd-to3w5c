import React, { useEffect, useRef, useCallback, memo } from 'react'; // v18.x
import styled from '@emotion/styled'; // v11.x
import { Portal } from '@mui/material'; // v5.x
import Button from './Button';
import Icon from './Icon';
import { ThemeColors } from '../../types/theme.types';

/**
 * Props interface for the Modal component with enhanced accessibility and customization options
 */
interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback function when modal should close */
  onClose: () => void;
  /** Modal title for header */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether clicking overlay closes modal */
  closeOnOverlayClick?: boolean;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** ID of element describing modal content */
  ariaDescribedBy?: string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
  /** Custom overlay color */
  overlayColor?: string;
}

/**
 * Styled overlay with theme integration and accessibility support
 */
const Overlay = styled.div<{ $overlayColor?: string }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme, $overlayColor }) => 
    $overlayColor || `${theme.colors.background.overlay}E6`};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

/**
 * Styled modal container with responsive sizing and animations
 */
const ModalContainer = styled.div<{ $size: string }>`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: calc(100vh - 2rem);
  width: ${({ $size }) => {
    switch ($size) {
      case 'small': return 'min(400px, 90vw)';
      case 'large': return 'min(800px, 90vw)';
      default: return 'min(600px, 90vw)';
    }
  }};
  display: flex;
  flex-direction: column;
  animation: modalEnter 0.2s ease-out;

  @keyframes modalEnter {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const ModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.background.surface};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary.main};
`;

const ModalContent = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  
  /* Improve scrollbar appearance */
  scrollbar-width: thin;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.background.surface};
    border-radius: 3px;
  }
`;

/**
 * Custom hook for managing focus trap within modal
 */
const useFocusTrap = (modalRef: React.RefObject<HTMLDivElement>, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      modal.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, modalRef]);
};

/**
 * Modal component implementing Material Design principles with comprehensive accessibility support
 */
const Modal = memo<ModalProps>(({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
  ariaLabel,
  ariaDescribedBy,
  className,
  testId,
  overlayColor
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Trap focus within modal when open
  useFocusTrap(modalRef, isOpen);

  // Store previously focused element and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
    } else if (previousFocus.current) {
      previousFocus.current.focus();
    }
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <Overlay
        onClick={handleOverlayClick}
        $overlayColor={overlayColor}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
        data-testid={testId}
      >
        <ModalContainer
          ref={modalRef}
          $size={size}
          className={className}
          role="document"
        >
          <ModalHeader>
            {title && <ModalTitle>{title}</ModalTitle>}
            <Button
              variant="text"
              size="small"
              onClick={onClose}
              ariaLabel="Close modal"
              startIcon={<Icon name="close" size="small" />}
            />
          </ModalHeader>
          <ModalContent>{children}</ModalContent>
        </ModalContainer>
      </Overlay>
    </Portal>
  );
});

Modal.displayName = 'Modal';

export default Modal;