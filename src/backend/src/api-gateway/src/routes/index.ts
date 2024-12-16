/**
 * @fileoverview Main router configuration for API Gateway implementing secure,
 * performant routing with comprehensive middleware integration and monitoring.
 * 
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v6.0.0
import compression from 'compression'; // v1.7.4
import timeout from 'express-timeout-handler'; // v2.2.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import v1Router from './v1';
import { authenticateToken } from '../middleware/auth.middleware';
import { errorHandler } from '../middleware/error.middleware';
import { requestLogger } from '../middleware/logging.middleware';
import { createSuccessResponse, createErrorResponse } from '../../../shared/utils/response.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';

// Initialize router
const router = express.Router();

// Configure CORS whitelist
const CORS_WHITELIST = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

// Configure rate limiting
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per window

/**
 * Configure global rate limiting
 */
const globalRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configure security middleware with strict CSP
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
 * Configure CORS with whitelist
 */
router.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_WHITELIST.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 600, // 10 minutes
}));

/**
 * Configure response compression
 */
router.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // only compress responses > 1KB
}));

/**
 * Configure request timeout handling
 */
router.use(timeout.handler({
  timeout: 30000, // 30 seconds
  onTimeout: (req: Request, res: Response) => {
    res.status(503).json(createErrorResponse(
      ErrorCodes.SYSTEM_ERROR,
      'Request timeout',
      { timeout: 30000 }
    ));
  },
}));

/**
 * Apply global rate limiting
 */
router.use(globalRateLimit);

/**
 * Apply request logging
 */
router.use(requestLogger);

/**
 * Health check endpoint for monitoring
 * @route GET /health
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(createSuccessResponse({
      status: 'healthy',
      version: process.env.API_VERSION || '1.0.0',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * Mount v1 API routes with authentication
 * Path prefix: /api/v1
 */
router.use('/api/v1', authenticateToken, v1Router);

/**
 * Apply global error handling
 */
router.use(errorHandler);

/**
 * Handle 404 for unmatched routes
 */
router.use((req: Request, res: Response) => {
  res.status(404).json(createErrorResponse(
    ErrorCodes.SYSTEM_ERROR,
    'Resource not found',
    { path: req.path }
  ));
});

export default router;