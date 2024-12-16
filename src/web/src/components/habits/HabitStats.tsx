import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@mui/material/styles';
import { Skeleton } from '@mui/material';
import { HabitStatistics } from '../../types/habit.types';
import ProgressBar from '../common/ProgressBar';
import ErrorBoundary from '../common/ErrorBoundary';
import useHabits from '../../hooks/useHabits';

// Styled components with theme integration
const StatsContainer = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  position: 'relative',
  transition: 'all 0.3s ease-in-out',
}));

const StatCard = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  position: 'relative',
  overflow: 'hidden',
}));

const StatLabel = styled('span')(({ theme }) => ({
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.secondary,
  fontWeight: theme.typography.fontWeightMedium,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const StatValue = styled('div')(({ theme }) => ({
  fontSize: theme.typography.h4.fontSize,
  color: theme.palette.text.primary,
  fontWeight: theme.typography.fontWeightBold,
  transition: 'all 0.3s ease-in-out',
}));

const ErrorContainer = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  color: theme.palette.error.main,
  backgroundColor: theme.palette.error.light,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
}));

// Props interface
interface HabitStatsProps {
  habitId: string;
  statistics: HabitStatistics;
  className?: string;
  loading?: boolean;
  error?: Error;
  onRetry?: () => void;
}

// Helper function to format percentage values
const formatPercentage = (value: number): string => {
  const percentage = Math.round(value * 100);
  return `${percentage}%`;
};

// Custom hook for real-time statistics updates
const useStatisticsUpdate = (
  habitId: string,
  initialStats: HabitStatistics
) => {
  const [stats, setStats] = useState(initialStats);
  const { loading } = useHabits();

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  return { stats, loading };
};

const HabitStats: React.FC<HabitStatsProps> = ({
  habitId,
  statistics,
  className,
  loading = false,
  error,
  onRetry
}) => {
  // Use real-time statistics updates
  const { stats, loading: statsLoading } = useStatisticsUpdate(habitId, statistics);

  // Memoized values for performance
  const completionRate = useMemo(() => 
    formatPercentage(stats.completionRate),
    [stats.completionRate]
  );

  // Error retry handler
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  // Loading state renderer
  const renderSkeleton = () => (
    <StatsContainer className={className}>
      {[...Array(4)].map((_, index) => (
        <StatCard key={`skeleton-${index}`}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="80%" height={40} />
        </StatCard>
      ))}
    </StatsContainer>
  );

  // Error state renderer
  if (error) {
    return (
      <ErrorContainer role="alert">
        <ErrorBoundary
          fallbackTitle="Unable to load statistics"
          fallbackDescription="There was an error loading the habit statistics. Please try again."
          onError={handleRetry}
        />
      </ErrorContainer>
    );
  }

  // Loading state
  if (loading || statsLoading) {
    return renderSkeleton();
  }

  return (
    <StatsContainer className={className} role="region" aria-label="Habit Statistics">
      <StatCard>
        <StatLabel>Completion Rate</StatLabel>
        <ProgressBar
          value={stats.completionRate * 100}
          maxValue={100}
          color="primary"
          showLabel
          animated
          ariaLabel={`Completion rate: ${completionRate}`}
        />
      </StatCard>

      <StatCard>
        <StatLabel>Current Streak</StatLabel>
        <StatValue role="status" aria-live="polite">
          {stats.currentStreak} days
        </StatValue>
      </StatCard>

      <StatCard>
        <StatLabel>Best Streak</StatLabel>
        <StatValue>
          {stats.bestStreak} days
        </StatValue>
      </StatCard>

      <StatCard>
        <StatLabel>Total Completions</StatLabel>
        <StatValue>
          {stats.totalCompletions}
        </StatValue>
      </StatCard>
    </StatsContainer>
  );
};

export default React.memo(HabitStats);