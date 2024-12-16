/**
 * @fileoverview Migration file for creating the users table with comprehensive security features,
 * performance optimizations, and proper constraints for the habit tracking application.
 * 
 * @version 1.0.0
 * @requires knex@^2.5.1
 */

import { Knex } from 'knex'; // v2.5.1
import { BaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Creates the users table with all necessary columns, constraints, indexes, and triggers.
 * Implements security best practices and performance optimizations.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when migration is complete
 */
export async function up(knex: Knex): Promise<void> {
  // Enable required extensions if not already enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "citext"');

  // Create users table
  await knex.schema.createTable('users', (table) => {
    // Primary key with UUID
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable()
      .comment('Unique identifier for user with automatic UUID generation');

    // Case-insensitive email with validation
    table.specificType('email', 'citext')
      .unique()
      .notNullable()
      .comment('User\'s email address with case-insensitive uniqueness');

    // Secure password hash storage
    table.text('password_hash')
      .notNullable()
      .comment('Bcrypt hashed password');

    // User preferences as JSONB
    table.jsonb('preferences')
      .defaultTo('{}')
      .notNullable()
      .comment('User preferences and settings');

    // Timestamps with timezone
    table.timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('Record creation timestamp');
    
    table.timestamp('updated_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('Record update timestamp');
  });

  // Create indexes for performance optimization
  await knex.schema.raw(`
    CREATE UNIQUE INDEX users_email_idx ON users (email);
    CREATE INDEX users_created_at_idx ON users (created_at);
    CREATE INDEX users_email_active_idx ON users (email) 
    WHERE (preferences->>'active')::boolean = true;
  `);

  // Add check constraints
  await knex.schema.raw(`
    ALTER TABLE users 
    ADD CONSTRAINT email_format_check 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');

    ALTER TABLE users 
    ADD CONSTRAINT password_hash_length_check 
    CHECK (length(password_hash) >= 60);

    ALTER TABLE users 
    ADD CONSTRAINT preferences_json_check 
    CHECK (jsonb_typeof(preferences) = 'object');
  `);

  // Create updated_at trigger function
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create trigger for automatic updated_at updates
  await knex.schema.raw(`
    CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Set table storage parameters for performance
  await knex.schema.raw(`
    ALTER TABLE users 
    SET (
      autovacuum_vacuum_scale_factor = 0.05,
      autovacuum_analyze_scale_factor = 0.02,
      fillfactor = 90
    );
  `);

  // Enable row-level security
  await knex.schema.raw(`
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY users_self_access ON users
    FOR ALL
    USING (id = current_user_id());
  `);
}

/**
 * Rolls back the users table creation with comprehensive cleanup.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when rollback is complete
 */
export async function down(knex: Knex): Promise<void> {
  // Disable row-level security policies
  await knex.schema.raw('DROP POLICY IF EXISTS users_self_access ON users');

  // Remove trigger
  await knex.schema.raw('DROP TRIGGER IF EXISTS users_updated_at ON users');
  await knex.schema.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');

  // Drop table with cascading effect
  await knex.schema.dropTableIfExists('users');

  // Clean up any orphaned objects (optional extensions cleanup)
  // Note: We don't drop extensions as they might be used by other tables
}