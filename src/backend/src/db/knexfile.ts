// External dependencies
// dotenv v16.3.1 - Environment variable management
import dotenv from 'dotenv';
// knex v2.5.1 - Database configuration and query builder
import { Knex } from 'knex';

/**
 * Loads and validates required environment variables
 * Throws error if required variables are missing in production/staging
 */
const loadEnvironment = (): void => {
  dotenv.config();

  const requiredEnvVars = [
    'NODE_ENV',
    process.env.NODE_ENV === 'production' && 'DB_HOST',
    process.env.NODE_ENV === 'production' && 'DB_PORT',
    process.env.NODE_ENV === 'production' && 'DB_NAME',
    process.env.NODE_ENV === 'production' && 'DB_USER',
    process.env.NODE_ENV === 'production' && 'DB_PASSWORD',
    process.env.NODE_ENV === 'production' && 'DB_SSL_CA',
    process.env.NODE_ENV === 'production' && 'DB_SSL_CERT',
    process.env.NODE_ENV === 'production' && 'DB_SSL_KEY',
  ].filter(Boolean);

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName as string]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};

// Load environment variables before configuration
loadEnvironment();

/**
 * Environment-specific database configurations
 * Implements connection pooling, SSL, migrations, and performance optimizations
 */
const knexConfig: Record<string, Knex.Config> = {
  // Development environment configuration
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'habit_tracker_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: false,
      application_name: 'habit_tracker_dev',
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      createRetryIntervalMillis: 200,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      schemaName: 'public',
    },
    seeds: {
      directory: './seeds/development',
      loadExtensions: ['.ts'],
    },
    debug: true,
  },

  // Test environment configuration
  test: {
    client: 'postgresql',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: Number(process.env.TEST_DB_PORT) || 5432,
      database: process.env.TEST_DB_NAME || 'habit_tracker_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
      ssl: false,
      application_name: 'habit_tracker_test',
    },
    pool: {
      min: 2,
      max: 5,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      createRetryIntervalMillis: 200,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      schemaName: 'public',
    },
    seeds: {
      directory: './seeds/test',
      loadExtensions: ['.ts'],
    },
  },

  // Staging environment configuration
  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.STAGING_DB_HOST,
      port: Number(process.env.STAGING_DB_PORT),
      database: process.env.STAGING_DB_NAME,
      user: process.env.STAGING_DB_USER,
      password: process.env.STAGING_DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false,
        ca: process.env.STAGING_DB_SSL_CA,
        cert: process.env.STAGING_DB_SSL_CERT,
        key: process.env.STAGING_DB_SSL_KEY,
      },
      application_name: 'habit_tracker_staging',
    },
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      createRetryIntervalMillis: 200,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      schemaName: 'public',
    },
  },

  // Production environment configuration
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY,
      },
      application_name: 'habit_tracker_production',
    },
    pool: {
      min: 5,
      max: 30,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      createRetryIntervalMillis: 200,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      schemaName: 'public',
    },
  },
};

// Export the configuration for use in the application
export default knexConfig;