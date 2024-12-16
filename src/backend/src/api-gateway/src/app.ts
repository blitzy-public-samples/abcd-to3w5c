/**
 * @fileoverview Main API Gateway application configuration implementing comprehensive
 * security measures, performance optimizations, and standardized error handling.
 * 
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import helmet from 'helmet'; // v6.0.0
import compression from 'compression'; // v1.7.4
import morgan from 'morgan'; // v1.10.0
import { createCorsConfig } from './config/cors.config';
import { createRateLimitConfig } from './config/rate-limit.config';
import router from './routes/v1';
import { authenticateToken } from './middleware/auth.middleware';
import { createErrorResponse } from '../../shared/utils/response.util';
import { ErrorCodes } from '../../shared/constants/error-codes';

// Initialize Express application
const app: Express = express();

/**
 * Configures and applies all middleware to the Express application
 * with security and performance optimizations
 * @param app - Express application instance
 */
function configureMiddleware(app: Express): void {
  // Security middleware configuration
  app.use(helmet({
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

  // CORS configuration
  app.use(express.cors(createCorsConfig()));

  // Compression middleware with threshold
  app.use(compression({
    threshold: 0, // Compress all responses
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Request logging with context tracking
  app.use(morgan('[:date[iso]] :method :url :status :response-time ms - :res[content-length]', {
    skip: (req: Request) => req.path === '/health'
  }));

  // Body parsing middleware with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting configuration
  const rateLimitConfig = createRateLimitConfig(
    parseInt(process.env.RATE_LIMIT_MAX || '100'),
    parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
    {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  );
  app.use(rateLimitConfig);

  // Trust proxy settings for proper IP detection
  app.set('trust proxy', 1);
}

/**
 * Configures API routes with authentication and error handling
 * @param app - Express application instance
 */
function configureRoutes(app: Express): void {
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      version: process.env.API_VERSION || '1.0.0'
    });
  });

  // API routes with version prefix
  app.use('/api/v1', authenticateToken, router);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json(createErrorResponse(
      ErrorCodes.SYSTEM_ERROR,
      'Resource not found',
      { path: req.path }
    ));
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
}

/**
 * Initializes and starts the Express server
 * @param app - Express application instance
 */
async function startServer(app: Express): Promise<void> {
  try {
    const port = process.env.PORT || 3000;

    // Configure middleware and routes
    configureMiddleware(app);
    configureRoutes(app);

    // Start server
    app.listen(port, () => {
      console.info(`API Gateway listening on port ${port}`);
      console.info(`Environment: ${process.env.NODE_ENV}`);
      console.info(`Version: ${process.env.API_VERSION || '1.0.0'}`);
    });

    // Graceful shutdown handler
    process.on('SIGTERM', () => {
      console.info('SIGTERM received. Starting graceful shutdown...');
      // Implement graceful shutdown logic here
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(app);

export default app;