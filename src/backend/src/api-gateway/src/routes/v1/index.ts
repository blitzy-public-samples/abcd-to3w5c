/**
 * @fileoverview Main router configuration for API Gateway v1 routes.
 * Implements comprehensive route management with security, performance optimization,
 * monitoring, and proper middleware integration.
 * 
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v4.6.0
import rateLimit from 'express-rate-limit'; // v6.0.0
import authRouter from './auth.route';
import habitsRouter from './habits.route';
import analyticsRouter from './analytics.route';
import { createSuccessResponse, createErrorResponse } from '../../../../shared/utils/response.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

// Initialize router
const router = express.Router();

// Global rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

/**
 * Configure global rate limiting
 */
const globalRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MAX_REQUESTS_PER_WINDOW,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configure security middleware
 */
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
}));

/**
 * Configure CORS
 */
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 600, // 10 minutes
}));

/**
 * Apply global rate limiting
 */
router.use(globalRateLimit);

/**
 * Mount authentication routes
 * Path prefix: /auth
 */
router.use('/auth', authRouter);

/**
 * Mount habits routes
 * Path prefix: /habits
 */
router.use('/habits', habitsRouter);

/**
 * Mount analytics routes
 * Path prefix: /analytics
 */
router.use('/analytics', analyticsRouter);

/**
 * Health check endpoint for monitoring
 * @route GET /health
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthStatus = await checkSystemHealth();
    
    if (!healthStatus.healthy) {
      throw new Error('System health check failed');
    }

    res.json(createSuccessResponse({
      status: 'healthy',
      version: process.env.API_VERSION || '1.0.0',
      timestamp: new Date(),
      services: healthStatus.services
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * Error handling middleware
 */
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date()
  });

  res.status(500).json(createErrorResponse(
    ErrorCodes.SYSTEM_ERROR,
    'An unexpected error occurred',
    { path: req.path }
  ));
});

/**
 * 404 handler for unmatched routes
 */
router.use((req: Request, res: Response) => {
  res.status(404).json(createErrorResponse(
    ErrorCodes.SYSTEM_ERROR,
    'Resource not found',
    { path: req.path }
  ));
});

/**
 * Checks the health of all system dependencies
 * @returns Object containing health status of all services
 */
async function checkSystemHealth(): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
}> {
  try {
    // Check all critical service dependencies
    const authHealth = await checkServiceHealth(process.env.AUTH_SERVICE_URL + '/health');
    const habitsHealth = await checkServiceHealth(process.env.HABITS_SERVICE_URL + '/health');
    const analyticsHealth = await checkServiceHealth(process.env.ANALYTICS_SERVICE_URL + '/health');

    const services = {
      auth: authHealth,
      habits: habitsHealth,
      analytics: analyticsHealth
    };

    return {
      healthy: Object.values(services).every(status => status),
      services
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      healthy: false,
      services: {
        auth: false,
        habits: false,
        analytics: false
      }
    };
  }
}

/**
 * Checks the health of a specific service
 * @param healthEndpoint - URL of the service health endpoint
 * @returns boolean indicating service health status
 */
async function checkServiceHealth(healthEndpoint: string): Promise<boolean> {
  try {
    const response = await fetch(healthEndpoint, {
      method: 'GET',
      timeout: 5000 // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.error(`Service health check failed for ${healthEndpoint}:`, error);
    return false;
  }
}

export default router;