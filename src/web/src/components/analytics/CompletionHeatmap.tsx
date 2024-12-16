import React, { useEffect, useMemo, useCallback, memo } from 'react'; // v18.0.0
import styled from '@emotion/styled'; // v11.x
import { useAnalytics } from '../../hooks/useAnalytics';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { useTheme } from '../../hooks/useTheme';
import { HeatmapData, AnalyticsTimeframe } from '../../types/analytics.types';
import { HEATMAP_CONFIG } from '../../constants/analytics.constants';

interface CompletionHeatmapProps {
  timeframe: AnalyticsTimeframe;
  habitId?: string;
  className?: string;
  onCellClick?: (date: string, value: number) => void;
}

// Styled components with theme integration
const HeatmapContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.medium};
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const HeatmapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, ${HEATMAP_CONFIG.CELL_SIZE}px);
  gap: 4px;
  padding: ${({ theme }) => theme.spacing.medium};
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(7, minmax(24px, ${HEATMAP_CONFIG.CELL_SIZE}px));
  }
`;

const HeatmapCell = styled.button<{ $intensity: number; $color: string }>`
  width: 100%;
  aspect-ratio: 1;
  border: none;
  border-radius: 2px;
  background-color: ${({ $intensity, $color }) => `${$color}${Math.floor($intensity * 100)}`};
  cursor: pointer;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: scale(1.1);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: 2px;
  }
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};
  padding: ${({ theme }) => theme.spacing.small};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const LegendItem = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '';
    width: 12px;
    height: 12px;
    background-color: ${({ $color }) => $color};
    border-radius: 2px;
  }
`;

/**
 * Calculates the color intensity based on completion value and theme
 */
const getColorForValue = (value: number, isDarkTheme: boolean): string => {
  if (value === 0) return HEATMAP_CONFIG.COLORS.EMPTY;
  if (value < 0.25) return isDarkTheme ? HEATMAP_CONFIG.COLORS.MISSED : HEATMAP_CONFIG.COLORS.MISSED;
  if (value < 0.5) return isDarkTheme ? HEATMAP_CONFIG.COLORS.PARTIAL : HEATMAP_CONFIG.COLORS.PARTIAL;
  return isDarkTheme ? HEATMAP_CONFIG.COLORS.COMPLETED : HEATMAP_CONFIG.COLORS.COMPLETED;
};

/**
 * A performant and accessible heatmap visualization component for habit completion data
 */
const CompletionHeatmap: React.FC<CompletionHeatmapProps> = memo(({
  timeframe,
  habitId,
  className,
  onCellClick
}) => {
  const { heatmapData, loading, error, fetchHeatmap } = useAnalytics();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  // Fetch heatmap data on mount and when dependencies change
  useEffect(() => {
    fetchHeatmap(timeframe);
  }, [fetchHeatmap, timeframe, habitId]);

  // Memoize grid data calculations
  const gridData = useMemo(() => {
    if (!heatmapData?.length) return [];
    
    return heatmapData.map(item => ({
      date: new Date(item.date).toISOString(),
      value: item.value,
      color: getColorForValue(item.value, isDarkTheme),
      status: item.status
    }));
  }, [heatmapData, isDarkTheme]);

  // Handle cell click with keyboard support
  const handleCellClick = useCallback((date: string, value: number) => {
    if (onCellClick) {
      onCellClick(date, value);
    }
  }, [onCellClick]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    const { key } = event;
    const gridWidth = 7;
    let newIndex = index;

    switch (key) {
      case 'ArrowRight':
        newIndex = Math.min(index + 1, gridData.length - 1);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(index - 1, 0);
        break;
      case 'ArrowUp':
        newIndex = Math.max(index - gridWidth, 0);
        break;
      case 'ArrowDown':
        newIndex = Math.min(index + gridWidth, gridData.length - 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    const cell = document.querySelector(`[data-index="${newIndex}"]`) as HTMLElement;
    cell?.focus();
  }, [gridData.length]);

  if (loading) {
    return <LoadingSpinner size={32} />;
  }

  if (error) {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load heatmap"
        fallbackDescription="There was an error loading the completion heatmap. Please try again."
      />
    );
  }

  return (
    <HeatmapContainer className={className} role="grid" aria-label="Habit completion heatmap">
      <HeatmapGrid>
        {gridData.map((cell, index) => (
          <HeatmapCell
            key={cell.date}
            $intensity={cell.value}
            $color={cell.color}
            onClick={() => handleCellClick(cell.date, cell.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            data-index={index}
            role="gridcell"
            aria-label={`${cell.status} on ${new Date(cell.date).toLocaleDateString()}`}
            tabIndex={0}
          />
        ))}
      </HeatmapGrid>
      
      <Legend role="list" aria-label="Heatmap color legend">
        {Object.entries(HEATMAP_CONFIG.ACCESSIBILITY).map(([key, label]) => (
          <LegendItem
            key={key}
            $color={HEATMAP_CONFIG.COLORS[key.replace('_LABEL', '') as keyof typeof HEATMAP_CONFIG.COLORS]}
            role="listitem"
          >
            {label}
          </LegendItem>
        ))}
      </Legend>
    </HeatmapContainer>
  );
});

CompletionHeatmap.displayName = 'CompletionHeatmap';

export default CompletionHeatmap;