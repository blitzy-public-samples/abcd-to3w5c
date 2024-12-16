/**
 * @fileoverview Analytics routes implementation for the API Gateway.
 * Provides secure, performant endpoints for habit tracking statistics and data visualization.
 * 
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express'; // v4.18.2
import { authenticateToken } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { AnalyticsTimeframe } from '../../../../analytics-service/src/interfaces/analytics.interface';
import { createSuccessResponse, createErrorResponse } from '../../../../shared/utils/response.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';
import { AppError } from '../../../../shared/interfaces/error.interface';
import { UUID } from '../../../../shared/interfaces/base.interface';

// Initialize router
const router = Router();

// Analytics request validation schemas
class HabitAnalyticsQuery {
  timeframe: AnalyticsTimeframe = AnalyticsTimeframe.WEEKLY;
  startDate?: Date;
  endDate?: Date;
}

class UserAnalyticsQuery {
  timeframe: AnalyticsTimeframe = AnalyticsTimeframe.MONTHLY;
  includeInactive: boolean = false;
}

/**
 * Cache configuration for analytics endpoints
 */
const CACHE_CONFIG = {
  habitAnalytics: { ttl: 300 }, // 5 minutes
  userAnalytics: { ttl: 600 },  // 10 minutes
  trends: { ttl: 1800 }         // 30 minutes
};

/**
 * Retrieves analytics data for a specific habit
 * @route GET /api/v1/analytics/habits/:habitId
 */
async function getHabitAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const habitId = req.params.habitId as UUID;
    const userId = req.user!.userId;
    const query = req.query as unknown as HabitAnalyticsQuery;

    // Validate habit ownership
    const hasAccess = await validateHabitOwnership(habitId, userId);
    if (!hasAccess) {
      throw new AppError(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Access denied to habit analytics',
        { habitId }
      );
    }

    // Fetch analytics with caching
    const cacheKey = `habit-analytics:${habitId}:${query.timeframe}`;
    const analytics = await getCachedAnalytics(
      cacheKey,
      () => fetchHabitAnalytics(habitId, query),
      CACHE_CONFIG.habitAnalytics.ttl
    );

    res.json(createSuccessResponse(analytics));
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves aggregated analytics for all user habits
 * @route GET /api/v1/analytics/user
 */
async function getUserAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const query = req.query as unknown as UserAnalyticsQuery;

    // Fetch user analytics with caching
    const cacheKey = `user-analytics:${userId}:${query.timeframe}`;
    const analytics = await getCachedAnalytics(
      cacheKey,
      () => fetchUserAnalytics(userId, query),
      CACHE_CONFIG.userAnalytics.ttl
    );

    res.json(createSuccessResponse(analytics));
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves trend analysis data for habits
 * @route GET /api/v1/analytics/trends
 */
async function getTrendAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const timeframe = req.query.timeframe as AnalyticsTimeframe || AnalyticsTimeframe.MONTHLY;

    // Fetch trend analytics with caching
    const cacheKey = `trend-analytics:${userId}:${timeframe}`;
    const trends = await getCachedAnalytics(
      cacheKey,
      () => fetchTrendAnalytics(userId, timeframe),
      CACHE_CONFIG.trends.ttl
    );

    res.json(createSuccessResponse(trends));
  } catch (error) {
    next(error);
  }
}

/**
 * Exports analytics data in specified format
 * @route POST /api/v1/analytics/export
 */
async function exportAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { format, timeframe, includeRawData } = req.body;

    const exportData = await generateAnalyticsExport(userId, {
      timeframe,
      format,
      includeRawData
    });

    res.setHeader('Content-Type', getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename=analytics-export.${format}`);
    res.send(exportData);
  } catch (error) {
    next(error);
  }
}

// Configure routes with authentication and validation
router.get(
  '/habits/:habitId',
  authenticateToken,
  validate(HabitAnalyticsQuery),
  getHabitAnalytics
);

router.get(
  '/user',
  authenticateToken,
  validate(UserAnalyticsQuery),
  getUserAnalytics
);

router.get(
  '/trends',
  authenticateToken,
  getTrendAnalytics
);

router.post(
  '/export',
  authenticateToken,
  exportAnalytics
);

// Helper functions
async function validateHabitOwnership(habitId: UUID, userId: UUID): Promise<boolean> {
  // Implementation would call habit service to verify ownership
  return true; // Placeholder
}

async function getCachedAnalytics<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Implementation would use Redis cache
  return fetchFn(); // Placeholder
}

async function fetchHabitAnalytics(habitId: UUID, query: HabitAnalyticsQuery): Promise<any> {
  // Implementation would call analytics service
  return {}; // Placeholder
}

async function fetchUserAnalytics(userId: UUID, query: UserAnalyticsQuery): Promise<any> {
  // Implementation would call analytics service
  return {}; // Placeholder
}

async function fetchTrendAnalytics(userId: UUID, timeframe: AnalyticsTimeframe): Promise<any> {
  // Implementation would call analytics service
  return {}; // Placeholder
}

async function generateAnalyticsExport(userId: UUID, config: any): Promise<any> {
  // Implementation would call analytics service
  return {}; // Placeholder
}

function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    'csv': 'text/csv',
    'json': 'application/json',
    'pdf': 'application/pdf'
  };
  return contentTypes[format] || 'application/octet-stream';
}

export default router;