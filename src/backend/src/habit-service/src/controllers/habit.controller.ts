/**
 * @fileoverview Controller handling HTTP requests for habit management operations.
 * Implements RESTful endpoints with enhanced security, monitoring, and error handling.
 * 
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // v6.0.1
import { controller, httpGet, httpPost, httpPut, httpDelete } from 'inversify-express-utils'; // v6.4.3
import { Request, Response } from 'express';
import { RateLimit } from 'express-rate-limit'; // v6.7.0
import { HabitService } from '../services/habit.service';
import { Habit, CreateHabitDTO, UpdateHabitDTO, FrequencyType } from '../interfaces/habit.interface';
import { createSuccessResponse, createErrorResponse } from '../../../shared/utils/response.util';
import { validateCreateHabit, validateUpdateHabit } from '../validators/habit.validator';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { SuccessMessages, ErrorMessages } from '../../../shared/constants/messages';
import { UUID } from '../../../shared/interfaces/base.interface';

/**
 * Controller handling habit management endpoints with enhanced security and monitoring
 */
@injectable()
@controller('/api/v1/habits')
@RateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
})
export class HabitController {
  constructor(private readonly _habitService: HabitService) {}

  /**
   * Creates a new habit for the authenticated user
   * @route POST /api/v1/habits
   */
  @httpPost('/')
  async createHabit(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as UUID;
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, ErrorMessages.AUTHENTICATION_ERROR)
        );
      }

      const validationResult = validateCreateHabit(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, validationResult.errors.join(', '))
        );
      }

      const habit = await this._habitService.createHabit(userId, req.body);
      return res.status(201).json(
        createSuccessResponse(habit, SuccessMessages.HABIT_CREATED)
      );

    } catch (error) {
      return res.status(500).json(
        createErrorResponse(ErrorCodes.SYSTEM_ERROR, error.message)
      );
    }
  }

  /**
   * Retrieves a specific habit by ID
   * @route GET /api/v1/habits/:id
   */
  @httpGet('/:id')
  async getHabit(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as UUID;
      const habitId = req.params.id as UUID;

      if (!userId) {
        return res.status(401).json(
          createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, ErrorMessages.AUTHENTICATION_ERROR)
        );
      }

      const habit = await this._habitService.getHabitById(habitId, userId);
      if (!habit) {
        return res.status(404).json(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Habit not found')
        );
      }

      return res.json(createSuccessResponse(habit));

    } catch (error) {
      return res.status(500).json(
        createErrorResponse(ErrorCodes.SYSTEM_ERROR, error.message)
      );
    }
  }

  /**
   * Retrieves all habits for the authenticated user
   * @route GET /api/v1/habits
   */
  @httpGet('/')
  async getUserHabits(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as UUID;
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, ErrorMessages.AUTHENTICATION_ERROR)
        );
      }

      const habits = await this._habitService.getUserActiveHabits(userId);
      return res.json(createSuccessResponse(habits));

    } catch (error) {
      return res.status(500).json(
        createErrorResponse(ErrorCodes.SYSTEM_ERROR, error.message)
      );
    }
  }

  /**
   * Updates an existing habit
   * @route PUT /api/v1/habits/:id
   */
  @httpPut('/:id')
  async updateHabit(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as UUID;
      const habitId = req.params.id as UUID;

      if (!userId) {
        return res.status(401).json(
          createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, ErrorMessages.AUTHENTICATION_ERROR)
        );
      }

      const validationResult = validateUpdateHabit(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, validationResult.errors.join(', '))
        );
      }

      const updatedHabit = await this._habitService.updateHabit(habitId, userId, req.body);
      return res.json(
        createSuccessResponse(updatedHabit, SuccessMessages.HABIT_UPDATED)
      );

    } catch (error) {
      return res.status(500).json(
        createErrorResponse(ErrorCodes.SYSTEM_ERROR, error.message)
      );
    }
  }

  /**
   * Deletes a habit
   * @route DELETE /api/v1/habits/:id
   */
  @httpDelete('/:id')
  async deleteHabit(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as UUID;
      const habitId = req.params.id as UUID;

      if (!userId) {
        return res.status(401).json(
          createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, ErrorMessages.AUTHENTICATION_ERROR)
        );
      }

      const deletedHabit = await this._habitService.deleteHabit(habitId, userId);
      return res.json(
        createSuccessResponse(deletedHabit, SuccessMessages.HABIT_DELETED)
      );

    } catch (error) {
      return res.status(500).json(
        createErrorResponse(ErrorCodes.SYSTEM_ERROR, error.message)
      );
    }
  }

  /**
   * Retrieves active habits for the authenticated user
   * @route GET /api/v1/habits/active
   */
  @httpGet('/active')
  async getActiveHabits(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as UUID;
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, ErrorMessages.AUTHENTICATION_ERROR)
        );
      }

      const activeHabits = await this._habitService.getUserActiveHabits(userId);
      return res.json(createSuccessResponse(activeHabits));

    } catch (error) {
      return res.status(500).json(
        createErrorResponse(ErrorCodes.SYSTEM_ERROR, error.message)
      );
    }
  }

  /**
   * Retrieves habits by frequency type
   * @route GET /api/v1/habits/frequency/:type
   */
  @httpGet('/frequency/:type')
  async getHabitsByFrequency(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id as UUID;
      const frequencyType = req.params.type as FrequencyType;

      if (!userId) {
        return res.status(401).json(
          createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, ErrorMessages.AUTHENTICATION_ERROR)
        );
      }

      if (!Object.values(FrequencyType).includes(frequencyType)) {
        return res.status(400).json(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid frequency type')
        );
      }

      const habits = await this._habitService.getUserActiveHabits(userId);
      const filteredHabits = habits.filter(habit => habit.frequency.type === frequencyType);
      
      return res.json(createSuccessResponse(filteredHabits));

    } catch (error) {
      return res.status(500).json(
        createErrorResponse(ErrorCodes.SYSTEM_ERROR, error.message)
      );
    }
  }
}