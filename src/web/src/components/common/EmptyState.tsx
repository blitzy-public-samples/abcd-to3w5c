import React from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import styled from '@emotion/styled'; // v11.x
import Icon from './Icon';
import Button from './Button';

/**
 * Props interface for EmptyState component with comprehensive accessibility support
 */
interface EmptyStateProps {
  /** Main heading text for empty state */
  title: string;
  /** Optional subtext explaining the empty state */
  description?: string;
  /** Name of icon to display from Icon component */
  iconName?: string;
  /** Text for action button */
  buttonText?: string;
  /** Click handler for action button */
  onActionClick?: () => void;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for component testing */
  testId?: string;
}

/**
 * Styled container with responsive layout and theme integration
 */
const Container = styled.article`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing(3)};
  min-height: 200px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  
  /* Responsive padding adjustments */
  @media (min-width: 768px) {
    padding: ${({ theme }) => theme.spacing(4)};
  }
`;

/**
 * Styled heading with fluid typography
 */
const Title = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.primary.main};
  margin: ${({ theme }) => theme.spacing(2, 0)};
  
  @media (min-width: 768px) {
    font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  }
`;

/**
 * Styled description text with proper line height
 */
const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  color: ${({ theme }) => theme.colors.background.surface};
  margin-bottom: ${({ theme }) => theme.spacing(3)};
  max-width: 80%;
  
  @media (min-width: 768px) {
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
  }
`;

/**
 * Styled icon wrapper with proper spacing
 */
const IconWrapper = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.primary.light};
`;

/**
 * A responsive and accessible empty state component following Material Design principles.
 * Implements WCAG 2.1 Level AA compliance with proper ARIA attributes and semantic HTML.
 *
 * @param props - EmptyState component props
 * @returns Rendered empty state component with semantic HTML structure
 */
const EmptyState = React.memo<EmptyStateProps>(({
  title,
  description,
  iconName,
  buttonText,
  onActionClick,
  className,
  testId = 'empty-state'
}) => {
  // Generate container class names
  const containerClasses = classNames(
    'empty-state',
    className
  );

  return (
    <Container
      className={containerClasses}
      role="status"
      aria-label={title}
      data-testid={testId}
    >
      {iconName && (
        <IconWrapper>
          <Icon
            name={iconName}
            size="large"
            ariaLabel={`${title} illustration`}
            focusable={false}
          />
        </IconWrapper>
      )}

      <Title>{title}</Title>

      {description && (
        <Description>{description}</Description>
      )}

      {buttonText && onActionClick && (
        <Button
          variant="primary"
          size="medium"
          onClick={onActionClick}
          ariaLabel={buttonText}
        >
          {buttonText}
        </Button>
      )}
    </Container>
  );
});

// Set display name for better debugging
EmptyState.displayName = 'EmptyState';

export default EmptyState;

/**
 * Type export for component props to support external usage
 */
export type { EmptyStateProps };