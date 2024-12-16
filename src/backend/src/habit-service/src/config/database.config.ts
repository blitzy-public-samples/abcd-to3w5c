/**
 * @fileoverview Database configuration module for the habit tracking service.
 * Provides type-safe database connection settings and client initialization using Prisma ORM.
 * Implements connection pooling, monitoring, and security optimizations.
 * 
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // v4.9.0
import * as dotenv from 'dotenv'; // v16.3.1
import { BaseEntity } from '../../../shared/interfaces/base.interface';

// Load environment variables
dotenv.config();

/**
 * Interface defining comprehensive database configuration options
 * including security, monitoring, and performance settings
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: {
    enabled: boolean;
    rejectUnauthorized: boolean;
    ca?: string;
  };
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number;
    reapIntervalMillis: number;
  };
  monitoring: {
    enabled: boolean;
    slowQueryThreshold: number;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Development environment database configuration
 */
const developmentConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'habit_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: {
    enabled: false,
    rejectUnauthorized: false,
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    reapIntervalMillis: 1000,
  },
  monitoring: {
    enabled: true,
    slowQueryThreshold: 100,
    logLevel: 'debug',
  },
};

/**
 * Production environment database configuration
 */
const productionConfig: DatabaseConfig = {
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  ssl: {
    enabled: true,
    rejectUnauthorized: false,
    ca: process.env.DB_SSL_CA,
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    reapIntervalMillis: 1000,
  },
  monitoring: {
    enabled: true,
    slowQueryThreshold: 50,
    logLevel: 'error',
  },
};

/**
 * Get environment-specific database configuration
 */
const getConfig = (): DatabaseConfig => {
  return process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig;
};

/**
 * Initialize and configure database connection with comprehensive error handling,
 * connection testing, and monitoring setup
 * 
 * @returns Promise<PrismaClient> Configured and validated Prisma client instance
 * @throws Error if database connection cannot be established
 */
export const initializeDatabase = async (): Promise<PrismaClient> => {
  const config = getConfig();
  
  // Configure Prisma client with logging and monitoring
  const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
    datasources: {
      db: {
        url: `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}?schema=public${
          config.ssl.enabled ? '&sslmode=require' : ''
        }`,
      },
    },
  });

  // Configure query logging and monitoring
  if (config.monitoring.enabled) {
    prisma.$on('query', (e: any) => {
      if (e.duration >= config.monitoring.slowQueryThreshold) {
        console.warn(`Slow query detected (${e.duration}ms):`, e.query);
      }
      if (config.monitoring.logLevel === 'debug') {
        console.debug('Query:', e.query, 'Duration:', e.duration, 'ms');
      }
    });

    prisma.$on('error', (e: any) => {
      console.error('Database error:', e);
    });
  }

  // Test database connection
  try {
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 
        config.pool.acquireTimeoutMillis)
      ),
    ]);

    console.info('Database connection established successfully');
    return prisma;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

// Export configured Prisma client instance
export const prisma = new PrismaClient();

// Ensure proper cleanup on application shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * Type guard to ensure entity has base fields
 */
export const isBaseEntity = (entity: any): entity is BaseEntity => {
  return (
    entity &&
    typeof entity.id === 'string' &&
    entity.createdAt instanceof Date &&
    entity.updatedAt instanceof Date
  );
};