/**
 * @fileoverview Main application entry point for the authentication microservice.
 * Configures and initializes the NestJS application with enhanced security features,
 * comprehensive monitoring, and resilient error handling.
 * 
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { join } from 'path';
import * as compression from 'compression'; // ^1.7.4
import * as cookieParser from 'cookie-parser'; // ^1.4.6
import * as rateLimit from 'express-rate-limit'; // ^6.7.0
import { PrometheusModule } from '@willsoto/nestjs-prometheus'; // ^5.0.0

import { AuthController } from './controllers/auth.controller';
import { ErrorCodes } from '../../shared/constants/error-codes';
import { ErrorMessages } from '../../shared/constants/messages';
import { createErrorResponse } from '../../shared/interfaces/error.interface';

// Security constants
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10); // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const CIRCUIT_BREAKER_TIMEOUT = parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '5000', 10);

/**
 * Bootstrap the NestJS authentication microservice application
 * with enhanced security and monitoring
 */
async function bootstrap(): Promise<void> {
  try {
    // Create NestJS application with microservice configuration
    const app = await NestFactory.create(AuthController, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-Token-Version']
      }
    });

    // Configure gRPC microservice transport
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: join(__dirname, process.env.PROTO_PATH || '../proto/auth.proto'),
        url: `${process.env.AUTH_SERVICE_HOST}:${process.env.AUTH_SERVICE_PORT}`,
        credentials: true,
        maxSendMessageLength: 10 * 1024 * 1024, // 10MB
        maxReceiveMessageLength: 10 * 1024 * 1024 // 10MB
      }
    });

    // Apply security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-site' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    }));

    // Configure rate limiting
    app.use(rateLimit({
      windowMs: RATE_LIMIT_WINDOW,
      max: RATE_LIMIT_MAX_REQUESTS,
      message: { 
        code: ErrorCodes.AUTHENTICATION_ERROR,
        message: 'Too many requests, please try again later'
      }
    }));

    // Apply compression
    app.use(compression());

    // Configure cookie parser with secure options
    app.use(cookieParser(process.env.COOKIE_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }));

    // Configure global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validationError: {
        target: false,
        value: false
      }
    }));

    // Configure Prometheus monitoring
    app.register(PrometheusModule.forRoot({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'auth_service_'
        }
      },
      path: '/metrics'
    }));

    // Global error handler
    app.useGlobalFilters({
      catch: (error: Error) => {
        console.error('Unhandled error:', error);
        return createErrorResponse({
          code: ErrorCodes.SYSTEM_ERROR,
          message: ErrorMessages.SYSTEM_ERROR,
          details: { error: error.message }
        });
      }
    });

    // Start microservice
    await app.startAllMicroservices();

    // Start HTTP server
    await app.listen(process.env.AUTH_SERVICE_PORT || 3000);

    console.log(`Auth service is running on port ${process.env.AUTH_SERVICE_PORT}`);

  } catch (error) {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Start the application
bootstrap();