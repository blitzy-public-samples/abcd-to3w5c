/**
 * @fileoverview Health check route handler for the API Gateway service.
 * Implements Kubernetes liveness and readiness probes, dependency health verification,
 * and system performance metrics collection for monitoring and alerting.
 * 
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express'; // v4.18.2
import { createSuccessResponse } from '../../../../shared/utils/response.util';

// Constants for health check configuration
const STARTUP_TIME = new Date();
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds timeout for dependency checks
const CACHE_TTL = 5000; // 5 seconds cache TTL for health check results

// Cache for health check results to prevent excessive dependency checks
let healthCheckCache: {
  timestamp: Date;
  status: Record<string, boolean>;
} | null = null;

const healthRouter = Router();

/**
 * Comprehensive health check handler that returns detailed service metrics
 * Used for monitoring and alerting systems
 */
async function getHealth(_req: Request, res: Response): Promise<Response> {
  const uptime = Math.floor((new Date().getTime() - STARTUP_TIME.getTime()) / 1000);
  
  // Collect memory metrics
  const memoryUsage = process.memoryUsage();
  const metrics = {
    uptime,
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
    },
    version: process.env.SERVICE_VERSION || '1.0.0',
    startTime: STARTUP_TIME.toISOString(),
  };

  return res.status(200).json(createSuccessResponse(metrics));
}

/**
 * Basic liveness probe handler for Kubernetes
 * Returns 200 if the service is running, 500 if critical failure
 */
function getLiveness(_req: Request, res: Response): Response {
  try {
    // Basic service health verification
    if (process.uptime() > 0) {
      return res.status(200).json(createSuccessResponse({
        status: 'ok',
        timestamp: new Date().toISOString()
      }));
    }
    throw new Error('Service is unhealthy');
  } catch (error) {
    return res.status(500).json(createSuccessResponse({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}

/**
 * Comprehensive readiness probe handler that checks all dependencies
 * Returns detailed status of all service dependencies
 */
async function getReadiness(_req: Request, res: Response): Promise<Response> {
  // Check cache first
  if (healthCheckCache && 
      (new Date().getTime() - healthCheckCache.timestamp.getTime()) < CACHE_TTL) {
    return res.status(200).json(createSuccessResponse({
      status: 'ok',
      checks: healthCheckCache.status,
      cached: true
    }));
  }

  try {
    // Perform dependency health checks with timeout
    const checks = await Promise.race([
      verifyDependencies(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]) as Record<string, boolean>;

    // Cache the results
    healthCheckCache = {
      timestamp: new Date(),
      status: checks
    };

    // Determine overall status
    const isHealthy = Object.values(checks).every(status => status);
    const status = isHealthy ? 'ok' : 'degraded';

    return res.status(isHealthy ? 200 : 503).json(createSuccessResponse({
      status,
      checks,
      cached: false
    }));
  } catch (error) {
    return res.status(503).json(createSuccessResponse({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      cached: false
    }));
  }
}

/**
 * Verifies the health of all service dependencies
 * @returns Promise with status of each dependency
 */
async function verifyDependencies(): Promise<Record<string, boolean>> {
  const checks: Record<string, boolean> = {};

  try {
    // Add checks for each critical dependency
    checks['auth-service'] = await checkAuthService();
    checks['habit-service'] = await checkHabitService();
    checks['analytics-service'] = await checkAnalyticsService();
    checks['database'] = await checkDatabase();
    checks['cache'] = await checkCache();
  } catch (error) {
    console.error('Dependency check failed:', error);
  }

  return checks;
}

// Mock dependency check functions - replace with actual implementations
async function checkAuthService(): Promise<boolean> {
  return true; // Implement actual auth service health check
}

async function checkHabitService(): Promise<boolean> {
  return true; // Implement actual habit service health check
}

async function checkAnalyticsService(): Promise<boolean> {
  return true; // Implement actual analytics service health check
}

async function checkDatabase(): Promise<boolean> {
  return true; // Implement actual database health check
}

async function checkCache(): Promise<boolean> {
  return true; // Implement actual cache health check
}

// Route definitions
healthRouter.get('/health', getHealth);
healthRouter.get('/health/live', getLiveness);
healthRouter.get('/health/ready', getReadiness);

export default healthRouter;