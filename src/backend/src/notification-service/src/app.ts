/**
 * @fileoverview Main application entry point for the notification microservice.
 * Implements a secure, scalable NestJS application with comprehensive middleware,
 * monitoring, and API documentation.
 * 
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core'; // ^9.0.0
import { ValidationPipe } from '@nestjs/common'; // ^9.0.0
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // ^6.0.0
import helmet from 'helmet'; // ^6.0.0
import rateLimit from 'express-rate-limit'; // ^6.0.0
import { NotificationModule } from './notification.module';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { DEFAULT_EMAIL_CONFIG, initializeEmailClient } from './config/email.config';

// Environment variables with defaults
const PORT = process.env.PORT || 3003;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

/**
 * Configures Swagger documentation with security schemes and response schemas
 * @param app - NestJS application instance
 */
function setupSwagger(app: any): void {
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('API documentation for the Habit Tracker notification service')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('notifications', 'Notification management endpoints')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Notification Service API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });
}

/**
 * Bootstraps the NestJS application with comprehensive security and monitoring setup
 */
async function bootstrap(): Promise<void> {
  try {
    // Create NestJS application
    const app = await NestFactory.create(NotificationModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
        credentials: true,
      },
    });

    // Initialize email client
    await initializeEmailClient(DEFAULT_EMAIL_CONFIG);

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validateCustomDecorators: true,
    }));

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }));

    // Rate limiting
    app.use(rateLimit({
      windowMs: RATE_LIMIT_WINDOW,
      max: RATE_LIMIT_MAX,
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    }));

    // Setup Swagger documentation
    setupSwagger(app);

    // Global prefix for all routes
    app.setGlobalPrefix('api/v1');

    // Start the server
    await app.listen(PORT);
    console.log(`Notification service running on port ${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/api/docs`);

  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch(error => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});

// Export NotificationModule for testing
export { NotificationModule };