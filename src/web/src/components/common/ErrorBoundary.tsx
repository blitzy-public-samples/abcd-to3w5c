import React from 'react'; // v18.x
import EmptyState from './EmptyState';

/**
 * Props interface for ErrorBoundary component with accessibility and error handling options
 */
interface ErrorBoundaryProps {
  /** Child components to be rendered and monitored for errors */
  children: React.ReactNode;
  /** Custom title for error display */
  fallbackTitle?: string;
  /** Custom description for error display */
  fallbackDescription?: string;
  /** Optional error handler callback */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Enable automatic recovery attempts */
  enableRecovery?: boolean;
  /** Maximum number of recovery attempts before giving up */
  maxRecoveryAttempts?: number;
}

/**
 * State interface for ErrorBoundary component with error tracking and recovery information
 */
interface ErrorBoundaryState {
  /** Indicates if an error has occurred */
  hasError: boolean;
  /** The caught error object */
  error: Error | null;
  /** Additional error information */
  errorInfo: string;
  /** Number of recovery attempts made */
  recoveryAttempts: number;
  /** Indicates if recovery is in progress */
  isRecovering: boolean;
}

/**
 * A React error boundary component that provides graceful error handling with
 * accessibility support and Material Design principles.
 * Implements WCAG 2.1 Level AA compliance for error messaging.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorLogId: string;

  static defaultProps = {
    fallbackTitle: 'Something went wrong',
    fallbackDescription: 'We encountered an unexpected error. Please try again.',
    enableRecovery: true,
    maxRecoveryAttempts: 3
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: '',
      recoveryAttempts: 0,
      isRecovering: false
    };
    // Generate unique ID for error tracking
    this.errorLogId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Static lifecycle method called when an error occurs during rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Sanitize error message for security
    const sanitizedError = error.message.replace(/[<>]/g, '');
    
    return {
      hasError: true,
      error,
      errorInfo: sanitizedError
    };
  }

  /**
   * Lifecycle method for handling caught errors with monitoring integration
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Sanitize error details
    const sanitizedStack = errorInfo.componentStack
      .replace(/[<>]/g, '')
      .split('\n')
      .filter(line => line.trim())
      .join('\n');

    // Log error with tracking ID
    console.error(`[${this.errorLogId}] Error:`, {
      error: error.message,
      stack: sanitizedStack,
      timestamp: new Date().toISOString()
    });

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error information
    this.setState({
      errorInfo: sanitizedStack
    });

    // Attempt recovery if enabled and within limits
    if (
      this.props.enableRecovery &&
      this.state.recoveryAttempts < (this.props.maxRecoveryAttempts || 3)
    ) {
      this.attemptRecovery();
    }

    // Announce error to screen readers
    const errorMessage = `Error: ${error.message}. ${this.props.fallbackDescription}`;
    this.announceError(errorMessage);
  }

  /**
   * Announces error message to screen readers using ARIA live region
   */
  private announceError(message: string): void {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'alert');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.textContent = message;
    document.body.appendChild(liveRegion);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);
  }

  /**
   * Attempts to recover from error state
   */
  private async attemptRecovery(): Promise<void> {
    if (this.state.isRecovering) return;

    this.setState({ isRecovering: true });

    try {
      // Wait briefly before attempting recovery
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: '',
        recoveryAttempts: prevState.recoveryAttempts + 1,
        isRecovering: false
      }));

      // Log recovery attempt
      console.info(`[${this.errorLogId}] Recovery attempt ${this.state.recoveryAttempts + 1}`);
    } catch (recoveryError) {
      // If recovery fails, stay in error state
      this.setState({ isRecovering: false });
      console.error(`[${this.errorLogId}] Recovery failed:`, recoveryError);
    }
  }

  render(): React.ReactNode {
    const { hasError, error, isRecovering } = this.state;
    const {
      children,
      fallbackTitle,
      fallbackDescription,
      enableRecovery
    } = this.props;

    if (hasError) {
      return (
        <EmptyState
          title={fallbackTitle || 'Something went wrong'}
          description={fallbackDescription || 'We encountered an unexpected error. Please try again.'}
          iconName="error"
          buttonText={enableRecovery && !isRecovering ? 'Try Again' : undefined}
          onActionClick={enableRecovery ? () => this.attemptRecovery() : undefined}
          testId="error-boundary-fallback"
        />
      );
    }

    return children;
  }
}

export default ErrorBoundary;

/**
 * Type export for component props to support external usage
 */
export type { ErrorBoundaryProps };