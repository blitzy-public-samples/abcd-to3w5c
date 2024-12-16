/**
 * @fileoverview Main application entry point for the habit microservice.
 * Configures Express server with comprehensive security, monitoring, and performance optimizations.
 * Implements dependency injection, middleware chain, and graceful shutdown handling.
 * 
 * @version 1.0.0
 */

import 'reflect-metadata'; // Required for inversify
import express from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v6.0.1
import compression from 'compression'; // v1.7.4
import { Container } from 'inversify'; // v6.0.1
import { InversifyExpressServer } from 'inversify-express-utils'; // v6.4.3
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { HabitController } from './controllers/habit.controller';
import { HabitService } from './services/habit.service';
import { HabitRepository } from './repositories/habit.repository';
import { initializeDatabase, prisma } from './config/database.config';
import { errorHandler } from '../../shared/middleware/error-handler';
import { logger } from '../../shared/utils/logger.util';
import Redis from 'ioredis'; // v5.3.2

/**
 * Configures dependency injection container with service bindings
 * @returns Configured Container instance
 */
const configureContainer = (): Container => {
  const container = new Container();

  // Configure Redis client
  const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  });

  // Bind services and repositories
  container.bind<HabitController>(HabitController).toSelf().inSingletonScope();
  container.bind<HabitService>(HabitService).toSelf().inSingletonScope();
  container.bind<HabitRepository>(HabitRepository).toConstantValue(
    new HabitRepository(prisma, redisClient, logger)
  );

  return container;
};

/**
 * Configures Express server with security middleware and routes
 * @param container - Configured dependency injection container
 * @returns Configured Express application
 */
const configureServer = (container: Container): express.Application => {
  const server = new InversifyExpressServer(container);

  server.setConfig((app) => {
    // Request correlation
    app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
      next();
    });

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: true,
      xssFilter: true
    }));

    // CORS configuration
    app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    }));

    // Response compression
    app.use(compression({
      level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
      threshold: '1kb',
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Body parsing
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  });

  // Error handling
  server.setErrorConfig((app) => {
    app.use(errorHandler({
      logErrors: true,
      includeStackTrace: process.env.NODE_ENV !== 'production',
      environment: process.env.NODE_ENV,
      securityOptions: {
        enableSecurityHeaders: true,
        hideErrorDetails: process.env.NODE_ENV === 'production'
      }
    }));
  });

  return server.build();
};

/**
 * Initializes and starts the habit service
 */
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connection established');

    // Configure DI container and server
    const container = configureContainer();
    const app = configureServer(container);

    // Start server
    const port = process.env.PORT || 3002;
    const server = app.listen(port, () => {
      logger.info(`Habit service listening on port ${port}`);
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      logger.info('Shutting down habit service...');
      
      server.close(async () => {
        try {
          await prisma.$disconnect();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start habit service:', error);
    process.exit(1);
  }
};

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export for testing
export { startServer, configureContainer, configureServer };