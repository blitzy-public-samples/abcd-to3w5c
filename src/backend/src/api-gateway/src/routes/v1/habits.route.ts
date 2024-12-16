/**
 * @fileoverview Express router module implementing RESTful endpoints for habit management
 * with comprehensive security, validation, and performance optimizations.
 * 
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express'; // v4.18.2
import { body, param, query } from 'express-validator'; // v6.14.0
import rateLimit from 'express-rate-limit'; // v6.0.0
import { authenticateToken, authorizeRoles } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createSuccessResponse, createErrorResponse } from '../../../../shared/utils/response.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';
import { SuccessMessages } from '../../../../shared/constants/messages';
import { PaginatedResponse } from '../../../../shared/interfaces/base.interface';

// Initialize router
const router = express.Router();

// Rate limiting configurations
const rateLimits = {
  list: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later'
  }),
  create: rateLimit({
    windowMs: 60 * 1000,
    max: 60
  }),
  update: rateLimit({
    windowMs: 60 * 1000,
    max: 60
  }),
  complete: rateLimit({
    windowMs: 60 * 1000,
    max: 120
  }),
  analytics: rateLimit({
    windowMs: 60 * 1000,
    max: 30
  })
};

// Validation schemas
const habitValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Habit name must be between 3 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('frequency')
      .isObject()
      .withMessage('Frequency must be a valid schedule object'),
    body('reminderTime')
      .optional()
      .isISO8601()
      .withMessage('Reminder time must be a valid ISO 8601 datetime')
  ],
  update: [
    param('id').isUUID().withMessage('Invalid habit ID'),
    body('name').optional().trim().isLength({ min: 3, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('frequency').optional().isObject(),
    body('reminderTime').optional().isISO8601()
  ],
  list: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('isActive').optional().isBoolean().toBoolean()
  ]
};

/**
 * GET /api/v1/habits
 * Retrieves paginated list of habits for authenticated user
 */
router.get('/habits',
  authenticateToken,
  rateLimits.list,
  habitValidation.list,
  validate(Request),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const isActive = req.query.isActive !== undefined ? 
        Boolean(req.query.isActive) : true;

      // Add cache control headers
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes

      // TODO: Call habit service to fetch habits
      const response: PaginatedResponse<any> = {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false
      };

      res.json(createSuccessResponse(response));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/habits
 * Creates a new habit for authenticated user
 */
router.post('/habits',
  authenticateToken,
  rateLimits.create,
  habitValidation.create,
  validate(Request),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: Call habit service to create habit
      const habit = req.body;

      res.status(201).json(
        createSuccessResponse(habit, SuccessMessages.HABIT_CREATED)
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/habits/:id
 * Updates an existing habit
 */
router.put('/habits/:id',
  authenticateToken,
  rateLimits.update,
  habitValidation.update,
  validate(Request),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const habitId = req.params.id;
      // TODO: Call habit service to update habit
      const updatedHabit = { ...req.body, id: habitId };

      res.json(
        createSuccessResponse(updatedHabit, SuccessMessages.HABIT_UPDATED)
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/habits/:id/complete
 * Marks a habit as completed for the current day
 */
router.post('/habits/:id/complete',
  authenticateToken,
  rateLimits.complete,
  [param('id').isUUID()],
  validate(Request),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const habitId = req.params.id;
      // TODO: Call habit service to mark habit as completed
      const completionStatus = { habitId, completedAt: new Date() };

      res.json(
        createSuccessResponse(completionStatus, SuccessMessages.HABIT_COMPLETED)
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/habits/stats
 * Retrieves habit statistics and analytics
 */
router.get('/habits/stats',
  authenticateToken,
  rateLimits.analytics,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Add cache control headers for analytics
      res.set('Cache-Control', 'private, max-age=3600'); // 1 hour

      // TODO: Call analytics service to get habit statistics
      const stats = {
        totalHabits: 0,
        completionRate: 0,
        currentStreak: 0
      };

      res.json(createSuccessResponse(stats));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Error handling middleware
 */
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Habit Route Error:', error);
  
  res.status(500).json(
    createErrorResponse(
      ErrorCodes.SYSTEM_ERROR,
      'An error occurred while processing your request',
      { error: error.message }
    )
  );
});

export default router;