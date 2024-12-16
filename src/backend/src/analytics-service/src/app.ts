/**
 * @fileoverview Main application entry point for the Analytics microservice.
 * Implements a high-performance NestJS application with comprehensive monitoring,
 * caching, and security features.
 * 
 * @version 1.0.0
 * @requires @nestjs/core@9.0.0
 * @requires @nestjs/common@9.0.0
 * @requires @nestjs/swagger@6.0.0
 * @requires ioredis@5.3.0
 */

import { NestFactory } from '@nestjs/core';
import { 
  Module, 
  Global,
  ValidationPipe,
  Logger,
  MiddlewareConsumer,
  RequestMethod
} from '@nestjs/common';
import { 
  SwaggerModule, 
  DocumentBuilder 
} from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as rateLimit from 'express-rate-limit';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { cacheConfig } from './config/cache.config';

// Environment variables with defaults
const PORT = process.env.PORT || 3002;
const SWAGGER_PATH = process.env.SWAGGER_PATH || 'api-docs';
const REDIS_CLUSTER_URLS = process.env.REDIS_CLUSTER_URLS?.split(',') || ['redis://localhost:6379'];
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Root module for Analytics microservice with enhanced security and monitoring
 */
@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      customMetrics: {
        analytics_request_duration_seconds: {
          type: 'Histogram',
          help: 'Analytics request duration in seconds',
          labelNames: ['endpoint', 'status'],
        },
        analytics_cache_hits_total: {
          type: 'Counter',
          help: 'Total number of cache hits',
          labelNames: ['cache_type'],
        },
      },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    {
      provide: 'CACHE_CONFIG',
      useValue: cacheConfig,
    },
    Logger,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(helmet(), compression(), 
        rateLimit({
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100, // limit each IP to 100 requests per windowMs
          message: 'Too many requests from this IP, please try again later',
        }))
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

/**
 * Enhanced application bootstrap function with comprehensive setup
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  try {
    // Create NestJS application instance with security options
    const app = await NestFactory.create(AnalyticsModule, {
      logger: LOG_LEVEL === 'debug' ? ['debug', 'error', 'warn', 'log'] : ['error', 'warn', 'log'],
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      },
    });

    // Configure global validation pipe with strict settings
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }));

    // Configure Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Analytics Service API')
      .setDescription('API documentation for the Analytics microservice')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Analytics')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(SWAGGER_PATH, app, document);

    // Configure security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
    }));

    // Configure performance monitoring
    app.use(compression());

    // Graceful shutdown handling
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.log(`Received ${signal}, starting graceful shutdown`);
        await app.close();
        process.exit(0);
      });
    });

    // Start server
    await app.listen(PORT);
    logger.log(`Analytics service running on port ${PORT}`);
    logger.log(`Swagger documentation available at /${SWAGGER_PATH}`);

  } catch (error) {
    logger.error('Failed to start analytics service:', error);
    process.exit(1);
  }
}

// Start application
bootstrap().catch(error => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});