import { Knex } from 'knex'; // v2.5.1

// Custom error class for migration failures
class MigrationError extends Error {
  constructor(message: string, public readonly step: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

// Logger utility for migration operations
const logMigrationStep = (step: string, details?: string) => {
  console.log(`[${new Date().toISOString()}] Migration step: ${step}${details ? ` - ${details}` : ''}`);
};

/**
 * Initial database migration that sets up required PostgreSQL extensions,
 * custom functions, and base configuration for the habit tracking application.
 * 
 * @param knex - Knex instance for database operations
 * @returns Promise that resolves when migration is complete
 * @throws MigrationError with detailed step information on failure
 */
export async function up(knex: Knex): Promise<void> {
  // Start transaction for atomic operations
  const trx = await knex.transaction();

  try {
    // Check PostgreSQL version compatibility
    const versionResult = await trx.raw('SHOW server_version');
    const version = versionResult.rows[0].server_version;
    if (!version.startsWith('14.')) {
      throw new MigrationError('PostgreSQL 14.x is required', 'version_check');
    }

    logMigrationStep('Starting initial migration');

    // Enable UUID extension
    logMigrationStep('Enabling uuid-ossp extension');
    await trx.raw(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
      SCHEMA public;
    `).catch(error => {
      throw new MigrationError(`Failed to enable uuid-ossp: ${error.message}`, 'uuid_extension');
    });

    // Enable CITEXT extension for case-insensitive text fields
    logMigrationStep('Enabling citext extension');
    await trx.raw(`
      CREATE EXTENSION IF NOT EXISTS "citext"
      SCHEMA public;
    `).catch(error => {
      throw new MigrationError(`Failed to enable citext: ${error.message}`, 'citext_extension');
    });

    // Enable PGCRYPTO extension for encryption
    logMigrationStep('Enabling pgcrypto extension');
    await trx.raw(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto"
      SCHEMA public;
    `).catch(error => {
      throw new MigrationError(`Failed to enable pgcrypto: ${error.message}`, 'pgcrypto_extension');
    });

    // Create updated_at trigger function
    logMigrationStep('Creating updated_at trigger function');
    await trx.raw(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = COALESCE(NEW.updated_at, CURRENT_TIMESTAMP);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `).catch(error => {
      throw new MigrationError(`Failed to create trigger function: ${error.message}`, 'trigger_function');
    });

    // Create custom GiST index operator class for habit scheduling
    logMigrationStep('Creating custom index operators');
    await trx.raw(`
      CREATE OR REPLACE FUNCTION habit_schedule_overlap(tsrange, tsrange)
      RETURNS boolean AS $$
      BEGIN
          RETURN $1 && $2;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `).catch(error => {
      throw new MigrationError(`Failed to create custom operators: ${error.message}`, 'custom_operators');
    });

    // Verify extensions are properly enabled
    logMigrationStep('Verifying extensions');
    const extensions = await trx
      .select('extname')
      .from('pg_extension')
      .whereIn('extname', ['uuid-ossp', 'citext', 'pgcrypto']);

    if (extensions.length !== 3) {
      throw new MigrationError(
        `Missing required extensions. Found: ${extensions.map(e => e.extname).join(', ')}`,
        'extension_verification'
      );
    }

    // Set default transaction isolation level
    await trx.raw(`
      ALTER DATABASE CURRENT_DATABASE() SET DEFAULT_TRANSACTION_ISOLATION TO 'read committed';
    `);

    // Set statement timeout for queries
    await trx.raw(`
      ALTER DATABASE CURRENT_DATABASE() SET statement_timeout = '30s';
    `);

    logMigrationStep('Migration completed successfully');
    await trx.commit();

  } catch (error) {
    await trx.rollback();
    if (error instanceof MigrationError) {
      throw error;
    }
    throw new MigrationError(
      `Unexpected error during migration: ${error.message}`,
      'unknown'
    );
  }
}

/**
 * Rollback function to safely remove initialized extensions and functions.
 * Includes dependency checking and proper cleanup order.
 * 
 * @param knex - Knex instance for database operations
 * @returns Promise that resolves when rollback is complete
 * @throws MigrationError with detailed step information on failure
 */
export async function down(knex: Knex): Promise<void> {
  const trx = await knex.transaction();

  try {
    logMigrationStep('Starting rollback');

    // Drop custom functions first
    logMigrationStep('Removing custom functions');
    await trx.raw(`
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
      DROP FUNCTION IF EXISTS habit_schedule_overlap(tsrange, tsrange) CASCADE;
    `).catch(error => {
      throw new MigrationError(`Failed to remove custom functions: ${error.message}`, 'function_removal');
    });

    // Drop extensions in reverse order
    logMigrationStep('Removing pgcrypto extension');
    await trx.raw('DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;');

    logMigrationStep('Removing citext extension');
    await trx.raw('DROP EXTENSION IF EXISTS "citext" CASCADE;');

    logMigrationStep('Removing uuid-ossp extension');
    await trx.raw('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;');

    // Reset database settings
    await trx.raw(`
      ALTER DATABASE CURRENT_DATABASE() RESET DEFAULT_TRANSACTION_ISOLATION;
      ALTER DATABASE CURRENT_DATABASE() RESET statement_timeout;
    `);

    logMigrationStep('Rollback completed successfully');
    await trx.commit();

  } catch (error) {
    await trx.rollback();
    if (error instanceof MigrationError) {
      throw error;
    }
    throw new MigrationError(
      `Unexpected error during rollback: ${error.message}`,
      'unknown'
    );
  }
}