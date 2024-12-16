/**
 * @fileoverview Comprehensive test suite for habit-related React components
 * Testing functionality, accessibility, theme support, and user interactions
 * @version 1.0.0
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import { renderWithProviders } from '../utils/test-utils';
import HabitCard from '../../src/components/habits/HabitCard';
import HabitForm from '../../src/components/habits/HabitForm';
import { FrequencyType, HabitStatus } from '../../types/habit.types';
import { ThemeMode } from '../../types/theme.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data
const mockHabit = {
  id: 'test-habit-1',
  name: 'Test Habit',
  description: 'Test Description',
  frequency: {
    type: FrequencyType.DAILY,
    value: 1,
    days: [],
    customSchedule: null
  },
  status: HabitStatus.ACTIVE,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user-1',
  reminderTime: null
};

const mockCompletionDates = [
  new Date('2024-01-01T10:00:00Z'),
  new Date('2024-01-02T10:00:00Z'),
  new Date('2024-01-03T10:00:00Z')
];

// Test viewports
const viewports = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 }
};

describe('HabitCard', () => {
  // Mock callbacks
  const onComplete = vi.fn(() => Promise.resolve());
  const onEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders habit card with correct content', () => {
    renderWithProviders(
      <HabitCard
        habit={mockHabit}
        completionDates={mockCompletionDates}
        onComplete={onComplete}
        onEdit={onEdit}
        testId="habit-card"
      />
    );

    expect(screen.getByText(mockHabit.name)).toBeInTheDocument();
    expect(screen.getByText(mockHabit.description)).toBeInTheDocument();
    expect(screen.getByText(/3 day streak/i)).toBeInTheDocument();
  });

  it('passes accessibility audit', async () => {
    const { container } = renderWithProviders(
      <HabitCard
        habit={mockHabit}
        completionDates={mockCompletionDates}
        onComplete={onComplete}
        onEdit={onEdit}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', async () => {
    renderWithProviders(
      <HabitCard
        habit={mockHabit}
        completionDates={mockCompletionDates}
        onComplete={onComplete}
        onEdit={onEdit}
      />
    );

    const completeButton = screen.getByRole('button', { name: /complete/i });
    const editButton = screen.getByRole('button', { name: /edit/i });

    // Test keyboard focus order
    completeButton.focus();
    expect(document.activeElement).toBe(completeButton);
    userEvent.tab();
    expect(document.activeElement).toBe(editButton);
  });

  it('handles completion action with loading state', async () => {
    renderWithProviders(
      <HabitCard
        habit={mockHabit}
        completionDates={mockCompletionDates}
        onComplete={onComplete}
        onEdit={onEdit}
      />
    );

    const completeButton = screen.getByRole('button', { name: /complete/i });
    await userEvent.click(completeButton);

    expect(completeButton).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(mockHabit.id);
    });
  });

  it('adapts to different viewport sizes', () => {
    Object.entries(viewports).forEach(([size, dimensions]) => {
      window.resizeTo(dimensions.width, dimensions.height);
      
      const { container } = renderWithProviders(
        <HabitCard
          habit={mockHabit}
          completionDates={mockCompletionDates}
          onComplete={onComplete}
          onEdit={onEdit}
        />
      );

      expect(container.firstChild).toHaveStyle({
        width: size === 'mobile' ? '100%' : 'auto'
      });
    });
  });
});

describe('HabitForm', () => {
  const onSubmit = vi.fn(() => Promise.resolve());
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with initial values when creating new habit', () => {
    renderWithProviders(
      <HabitForm
        habit={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />
    );

    expect(screen.getByLabelText(/habit name/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
    expect(screen.getByLabelText(/daily/i)).toBeChecked();
  });

  it('validates required fields', async () => {
    renderWithProviders(
      <HabitForm
        habit={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/habit name is required/i)).toBeInTheDocument();
  });

  it('handles form submission with valid data', async () => {
    renderWithProviders(
      <HabitForm
        habit={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />
    );

    await userEvent.type(screen.getByLabelText(/habit name/i), 'New Habit');
    await userEvent.type(screen.getByLabelText(/description/i), 'New Description');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Habit',
      description: 'New Description'
    }));
  });

  it('displays loading state during submission', async () => {
    renderWithProviders(
      <HabitForm
        habit={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submitting form/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('supports theme switching', () => {
    const { rerender } = renderWithProviders(
      <HabitForm
        habit={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />,
      { initialState: { theme: { mode: ThemeMode.LIGHT } } }
    );

    // Check light theme styles
    expect(screen.getByRole('form')).toHaveStyle({
      backgroundColor: 'var(--color-background-paper)'
    });

    // Rerender with dark theme
    rerender(
      <HabitForm
        habit={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />,
      { initialState: { theme: { mode: ThemeMode.DARK } } }
    );

    // Check dark theme styles
    expect(screen.getByRole('form')).toHaveStyle({
      backgroundColor: 'var(--color-background-paper-dark)'
    });
  });
});