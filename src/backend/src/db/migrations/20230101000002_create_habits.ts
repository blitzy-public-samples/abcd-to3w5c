/**
 * @fileoverview Migration file for creating the habits table with comprehensive schema design
 * including columns, constraints, indexes, and triggers for the habit tracking application.
 * 
 * @version 1.0.0
 * @requires knex ^2.5.1
 */

import { Knex } from 'knex'; // ^2.5.1
import { BaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Creates the habits table with all necessary columns, constraints, indexes, and triggers.
 * Implements the core schema for habit tracking functionality with proper data validation
 * and performance optimization.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when migration is complete
 */
export async function up(knex: Knex): Promise<void> {
  // Create the habits table with comprehensive schema
  await knex.schema.createTable('habits', (table) => {
    // Primary key using UUID
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable()
      .comment('Unique identifier for habit record');

    // User reference with foreign key constraint
    table.uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .comment('Reference to user who owns the habit');

    // Core habit properties
    table.string('name', 255)
      .notNullable()
      .comment('Name or title of the habit');
    
    table.text('description')
      .nullable()
      .comment('Optional detailed description of the habit');

    // Frequency configuration using JSONB for flexible scheduling
    table.jsonb('frequency')
      .notNullable()
      .defaultTo('{}')
      .comment('Flexible scheduling configuration including type, value, and days');

    // Optional reminder time for notifications
    table.timestamp('reminder_time', { useTz: true })
      .nullable()
      .comment('Optional reminder time for habit notifications');

    // Status flag for active/inactive habits
    table.boolean('is_active')
      .notNullable()
      .defaultTo(true)
      .comment('Flag indicating if habit is currently active');

    // Audit timestamps
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when habit record was created');
    
    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when habit record was last updated');
  });

  // Create optimized indexes for common query patterns
  await knex.schema.raw(`
    -- Index for efficient lookup of user's habits
    CREATE INDEX habits_user_id_idx ON habits USING btree (user_id);

    -- Index for timestamp-based queries and sorting
    CREATE INDEX habits_created_at_idx ON habits USING btree (created_at);

    -- Index for filtering active/inactive habits
    CREATE INDEX habits_is_active_idx ON habits USING btree (is_active);

    -- Trigger for automatic updated_at timestamp updates
    CREATE TRIGGER habits_updated_at
      BEFORE UPDATE ON habits
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Add table comment for documentation
  await knex.schema.raw(`
    COMMENT ON TABLE habits IS 'Stores user habits with tracking configuration and status';
  `);
}

/**
 * Removes the habits table and all associated objects for clean rollback.
 * Ensures proper cleanup of all related database objects.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when rollback is complete
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers first to avoid dependency issues
  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS habits_updated_at ON habits;
  `);

  // Drop the table with CASCADE to clean up all dependencies
  await knex.schema.dropTableIfExists('habits');
}