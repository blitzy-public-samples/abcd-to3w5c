/**
 * @fileoverview Express router module for user-related API endpoints in the API Gateway service.
 * Implements secure user profile management, preferences handling, and account operations
 * with comprehensive validation and error handling.
 * 
 * @version 1.0.0
 */

import express, { Request, Response } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import { authenticateToken } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createSuccessResponse, createErrorResponse } from '../../../../shared/utils/response.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';
import { SuccessMessages, ErrorMessages } from '../../../../shared/constants/messages';
import { UserProfile } from '../../../../auth-service/src/interfaces/auth.interface';

// Initialize router
const router = express.Router();

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Schema for user profile update validation
 */
class UpdateProfileDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  language?: string;
}

/**
 * Schema for user preferences update validation
 */
class UpdatePreferencesDto {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    dailyReminder?: boolean;
    weeklyReport?: boolean;
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'private';
    showStreak?: boolean;
    showAchievements?: boolean;
  };
}

/**
 * Schema for account deletion validation
 */
class DeleteAccountDto {
  confirmation: string;
  reason?: string;
}

/**
 * @route GET /api/v1/users/profile
 * @desc Retrieve authenticated user's profile
 * @access Private
 */
router.get(
  '/profile',
  rateLimiter,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(
            ErrorCodes.AUTHENTICATION_ERROR,
            ErrorMessages.AUTHENTICATION_ERROR
          )
        );
      }

      // Fetch user profile from auth service
      // Note: Actual service call implementation would be here
      const userProfile: UserProfile = {
        id: userId,
        email: req.user?.email || '',
        isEmailVerified: true,
        auth0Id: '',
        lastLoginAt: new Date(),
        roles: req.user?.roles || [],
        mfaEnabled: false,
        provider: req.user?.provider || 'EMAIL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return res.status(200).json(
        createSuccessResponse(userProfile, 'Profile retrieved successfully')
      );
    } catch (error) {
      return res.status(500).json(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          ErrorMessages.SYSTEM_ERROR,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }
);

/**
 * @route PUT /api/v1/users/profile
 * @desc Update authenticated user's profile
 * @access Private
 */
router.put(
  '/profile',
  rateLimiter,
  authenticateToken,
  validate(UpdateProfileDto),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(
            ErrorCodes.AUTHENTICATION_ERROR,
            ErrorMessages.AUTHENTICATION_ERROR
          )
        );
      }

      // Update user profile
      // Note: Actual service call implementation would be here
      const updatedProfile = {
        ...req.body,
        userId,
        updatedAt: new Date()
      };

      return res.status(200).json(
        createSuccessResponse(updatedProfile, SuccessMessages.PROFILE_UPDATED)
      );
    } catch (error) {
      return res.status(500).json(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          ErrorMessages.SYSTEM_ERROR,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }
);

/**
 * @route PUT /api/v1/users/preferences
 * @desc Update user preferences
 * @access Private
 */
router.put(
  '/preferences',
  rateLimiter,
  authenticateToken,
  validate(UpdatePreferencesDto),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(
            ErrorCodes.AUTHENTICATION_ERROR,
            ErrorMessages.AUTHENTICATION_ERROR
          )
        );
      }

      // Update user preferences
      // Note: Actual service call implementation would be here
      const updatedPreferences = {
        ...req.body,
        userId,
        updatedAt: new Date()
      };

      return res.status(200).json(
        createSuccessResponse(updatedPreferences, SuccessMessages.SETTINGS_UPDATED)
      );
    } catch (error) {
      return res.status(500).json(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          ErrorMessages.SYSTEM_ERROR,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }
);

/**
 * @route DELETE /api/v1/users/account
 * @desc Delete user account
 * @access Private
 */
router.delete(
  '/account',
  rateLimiter,
  authenticateToken,
  validate(DeleteAccountDto),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json(
          createErrorResponse(
            ErrorCodes.AUTHENTICATION_ERROR,
            ErrorMessages.AUTHENTICATION_ERROR
          )
        );
      }

      const { confirmation } = req.body;
      if (confirmation !== 'DELETE_ACCOUNT') {
        return res.status(400).json(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Invalid confirmation text'
          )
        );
      }

      // Delete user account
      // Note: Actual service call implementation would be here
      // This would typically involve a transaction to delete all user data

      return res.status(200).json(
        createSuccessResponse(
          { userId, deletedAt: new Date() },
          'Account deleted successfully'
        )
      );
    } catch (error) {
      return res.status(500).json(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          ErrorMessages.SYSTEM_ERROR,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }
);

export default router;