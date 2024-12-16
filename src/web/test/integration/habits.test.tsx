/**
 * @fileoverview Integration tests for habit-related features including CRUD operations,
 * offline functionality, responsive behavior, and accessibility compliance.
 * @version 1.0.0
 */

import React from 'react';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { render, renderHook } from '../utils/test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { API_ENDPOINTS } from '../../constants/api.constants';
import { HABIT_STATUS, HABIT_DEFAULTS } from '../../constants/habit.constants';
import { FrequencyType, HabitStatus } from '../../types/habit.types';
import { BREAKPOINTS } from '../../constants/theme.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Test data
const TEST_HABIT = {
  id: '123',
  name: 'Test Habit',
  description: 'Test habit description',
  frequency: {
    type: FrequencyType.DAILY,
    value: 1,
    days: [1, 2, 3, 4, 5],
    customSchedule: null
  },
  status: HabitStatus.ACTIVE,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// MSW server setup
const server = setupServer(
  // Habits list endpoint
  rest.get(API_ENDPOINTS.HABITS.LIST, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          items: [TEST_HABIT],
          total: 1,
          page: 1,
          pageSize: 10
        }
      })
    );
  }),

  // Create habit endpoint
  rest.post(API_ENDPOINTS.HABITS.CREATE, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: { ...TEST_HABIT, id: '456' }
      })
    );
  }),

  // Update habit endpoint
  rest.put(`${API_ENDPOINTS.HABITS.BASE}/:id`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: { ...TEST_HABIT, ...req.body }
      })
    );
  }),

  // Log completion endpoint
  rest.post(`${API_ENDPOINTS.HABITS.BASE}/:id/logs`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: '789',
          habitId: req.params.id,
          completedAt: new Date(),
          notes: req.body.notes
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Habit List Integration Tests', () => {
  describe('Rendering and Layout', () => {
    it('renders habit list with responsive layout', async () => {
      const { container } = render(<HabitList />);

      // Wait for habits to load
      await waitFor(() => {
        expect(screen.getByText(TEST_HABIT.name)).toBeInTheDocument();
      });

      // Test responsive layout at different breakpoints
      const breakpoints = Object.values(BREAKPOINTS);
      for (const breakpoint of breakpoints) {
        window.resizeTo(parseInt(breakpoint), 800);
        await waitFor(() => {
          expect(container).toMatchSnapshot(`habit-list-${breakpoint}`);
        });
      }
    });

    it('meets accessibility requirements', async () => {
      const { container } = render(<HabitList />);
      await waitFor(() => {
        expect(screen.getByText(TEST_HABIT.name)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('CRUD Operations', () => {
    it('creates a new habit successfully', async () => {
      render(<HabitList />);
      const user = userEvent.setup();

      // Open create form
      await user.click(screen.getByRole('button', { name: /add habit/i }));

      // Fill form
      await user.type(screen.getByLabelText(/habit name/i), 'New Test Habit');
      await user.type(
        screen.getByLabelText(/description/i),
        'New habit description'
      );
      await user.selectOptions(
        screen.getByLabelText(/frequency/i),
        FrequencyType.DAILY
      );

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Verify success notification
      await waitFor(() => {
        expect(screen.getByText(/habit created successfully/i)).toBeInTheDocument();
      });
    });

    it('updates habit details correctly', async () => {
      render(<HabitList />);
      const user = userEvent.setup();

      // Wait for habit to load
      await waitFor(() => {
        expect(screen.getByText(TEST_HABIT.name)).toBeInTheDocument();
      });

      // Open edit form
      await user.click(screen.getByRole('button', { name: /edit habit/i }));

      // Update name
      const nameInput = screen.getByLabelText(/habit name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Habit Name');

      // Submit changes
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      // Verify success notification
      await waitFor(() => {
        expect(screen.getByText(/habit updated successfully/i)).toBeInTheDocument();
      });
    });

    it('logs habit completion with notes', async () => {
      render(<HabitList />);
      const user = userEvent.setup();

      // Wait for habit to load
      await waitFor(() => {
        expect(screen.getByText(TEST_HABIT.name)).toBeInTheDocument();
      });

      // Complete habit
      await user.click(screen.getByRole('button', { name: /complete habit/i }));

      // Add completion notes
      await user.type(
        screen.getByLabelText(/completion notes/i),
        'Test completion note'
      );

      // Save completion
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Verify success notification
      await waitFor(() => {
        expect(screen.getByText(/habit completed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Functionality', () => {
    beforeEach(() => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false });
    });

    afterEach(() => {
      // Restore online state
      Object.defineProperty(navigator, 'onLine', { value: true });
    });

    it('handles offline habit completion', async () => {
      render(<HabitList />);
      const user = userEvent.setup();

      // Complete habit while offline
      await user.click(screen.getByRole('button', { name: /complete habit/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Verify offline indicator
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();

      // Verify optimistic update
      expect(screen.getByText(/completed today/i)).toBeInTheDocument();
    });

    it('syncs offline changes when back online', async () => {
      render(<HabitList />);

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      // Verify sync notification
      await waitFor(() => {
        expect(screen.getByText(/syncing changes/i)).toBeInTheDocument();
      });

      // Verify sync completion
      await waitFor(() => {
        expect(screen.getByText(/changes synced successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Theme Integration', () => {
    it('renders correctly in different themes', async () => {
      const { container, rerender } = render(<HabitList />);

      // Test light theme
      await waitFor(() => {
        expect(container).toMatchSnapshot('habit-list-light-theme');
      });

      // Switch to dark theme
      rerender(<HabitList theme="dark" />);

      await waitFor(() => {
        expect(container).toMatchSnapshot('habit-list-dark-theme');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error notification on API failure', async () => {
      // Mock API error
      server.use(
        rest.get(API_ENDPOINTS.HABITS.LIST, (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              success: false,
              error: {
                message: 'Internal server error'
              }
            })
          );
        })
      );

      render(<HabitList />);

      // Verify error notification
      await waitFor(() => {
        expect(screen.getByText(/failed to load habits/i)).toBeInTheDocument();
      });
    });

    it('handles network timeouts gracefully', async () => {
      // Mock timeout
      server.use(
        rest.get(API_ENDPOINTS.HABITS.LIST, (req, res, ctx) => {
          return res(ctx.delay(5000));
        })
      );

      render(<HabitList />);

      // Verify timeout message
      await waitFor(() => {
        expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
      });
    });
  });
});