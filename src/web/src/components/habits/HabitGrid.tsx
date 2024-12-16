import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import { useMediaQuery } from '@mui/material'; // v5.x
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'; // v13.x
import { AutoSizer, Grid, GridCellProps, Size } from 'react-virtualized'; // v9.x

import HabitCard from './HabitCard';
import { Habit } from '../../types/habit.types';
import useHabits from '../../hooks/useHabits';
import useTheme from '../../hooks/useTheme';

/**
 * Props interface for HabitGrid component
 */
interface HabitGridProps {
  habits: Habit[];
  onHabitComplete: (habitId: string) => void;
  onHabitEdit: (habitId: string) => void;
  onHabitReorder: (startIndex: number, endIndex: number) => void;
  className?: string;
  loading?: boolean;
  error?: Error;
  virtualize?: boolean;
}

/**
 * Constants for grid layout and accessibility
 */
const GRID_CONSTANTS = {
  MIN_CARD_WIDTH: 300,
  CARD_GAP: 16,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  ARIA_LABELS: {
    GRID: 'Habits grid',
    DRAG_HANDLE: 'Drag to reorder habit',
    LOADING: 'Loading habits...',
    ERROR: 'Error loading habits'
  }
} as const;

/**
 * Calculates optimal number of grid columns based on container width
 */
const calculateGridColumns = (containerWidth: number, isMobile: boolean): number => {
  if (isMobile) return 1;
  const maxColumns = Math.floor(
    (containerWidth + GRID_CONSTANTS.CARD_GAP) / 
    (GRID_CONSTANTS.MIN_CARD_WIDTH + GRID_CONSTANTS.CARD_GAP)
  );
  return Math.max(1, Math.min(maxColumns, 3));
};

/**
 * A responsive, accessible grid component for displaying habit cards
 * Supports drag-and-drop reordering and virtual scrolling
 */
const HabitGrid: React.FC<HabitGridProps> = ({
  habits,
  onHabitComplete,
  onHabitEdit,
  onHabitReorder,
  className,
  loading = false,
  error,
  virtualize = false
}) => {
  // Hooks
  const { themeMode } = useTheme();
  const isMobile = useMediaQuery(`(max-width: ${GRID_CONSTANTS.MOBILE_BREAKPOINT}px)`);
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // Calculate grid layout
  const updateGridColumns = useCallback(() => {
    if (containerRef.current) {
      const newColumns = calculateGridColumns(
        containerRef.current.offsetWidth,
        isMobile
      );
      setColumns(newColumns);
    }
  }, [isMobile]);

  // Initialize and update grid layout
  useEffect(() => {
    updateGridColumns();
    const resizeObserver = new ResizeObserver(updateGridColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateGridColumns]);

  // Memoized grid cell renderer for virtualization
  const cellRenderer = useCallback(
    ({ columnIndex, rowIndex, style, key }: GridCellProps) => {
      const index = rowIndex * columns + columnIndex;
      const habit = habits[index];

      if (!habit) return null;

      return (
        <Draggable
          key={habit.id}
          draggableId={habit.id}
          index={index}
          isDragDisabled={loading}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              style={{
                ...style,
                ...provided.draggableProps.style,
                padding: GRID_CONSTANTS.CARD_GAP / 2
              }}
            >
              <HabitCard
                habit={habit}
                onComplete={onHabitComplete}
                onEdit={onHabitEdit}
                dragHandleProps={provided.dragHandleProps}
                isDragging={snapshot.isDragging}
                className={classNames('habit-grid__card', {
                  'habit-grid__card--dragging': snapshot.isDragging
                })}
              />
            </div>
          )}
        </Draggable>
      );
    },
    [habits, columns, loading, onHabitComplete, onHabitEdit]
  );

  // Handle drag end event
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const startIndex = result.source.index;
      const endIndex = result.destination.index;

      if (startIndex === endIndex) return;

      onHabitReorder(startIndex, endIndex);
    },
    [onHabitReorder]
  );

  // Render grid content based on state
  const renderGridContent = () => {
    if (error) {
      return (
        <div className="habit-grid__error" role="alert">
          <p>{GRID_CONSTANTS.ARIA_LABELS.ERROR}</p>
          <p>{error.message}</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="habit-grid__loading" role="status">
          <p>{GRID_CONSTANTS.ARIA_LABELS.LOADING}</p>
        </div>
      );
    }

    if (virtualize) {
      return (
        <AutoSizer>
          {({ width, height }: Size) => (
            <Grid
              cellRenderer={cellRenderer}
              columnCount={columns}
              rowCount={Math.ceil(habits.length / columns)}
              columnWidth={width / columns}
              rowHeight={400}
              width={width}
              height={height}
              overscanRowCount={2}
            />
          )}
        </AutoSizer>
      );
    }

    return habits.map((habit, index) => (
      <Draggable key={habit.id} draggableId={habit.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="habit-grid__item"
          >
            <HabitCard
              habit={habit}
              onComplete={onHabitComplete}
              onEdit={onHabitEdit}
              dragHandleProps={provided.dragHandleProps}
              isDragging={snapshot.isDragging}
              className={classNames('habit-grid__card', {
                'habit-grid__card--dragging': snapshot.isDragging
              })}
            />
          </div>
        )}
      </Draggable>
    ));
  };

  return (
    <div
      ref={containerRef}
      className={classNames('habit-grid', className, {
        'habit-grid--loading': loading,
        'habit-grid--error': error,
        [`habit-grid--${themeMode}`]: true
      })}
      role="grid"
      aria-label={GRID_CONSTANTS.ARIA_LABELS.GRID}
      aria-busy={loading}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable
          droppableId="habits-grid"
          direction={isMobile ? 'vertical' : 'horizontal'}
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={classNames('habit-grid__container', {
                'habit-grid__container--virtualized': virtualize
              })}
              style={{
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: GRID_CONSTANTS.CARD_GAP
              }}
            >
              {renderGridContent()}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

// Set display name for better debugging
HabitGrid.displayName = 'HabitGrid';

export default HabitGrid;