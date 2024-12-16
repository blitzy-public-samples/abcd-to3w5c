/**
 * @fileoverview Migration file for creating the habit_logs table that tracks habit completion records
 * with comprehensive columns, constraints, indexes, and proper timezone support.
 * 
 * @version 1.0.0
 * @requires knex ^2.5.1
 */

import { Knex } from 'knex'; // ^2.5.1
import { BaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Creates the habit_logs table with all necessary columns, constraints, and optimized indexes.
 * Implements comprehensive tracking of habit completions with proper timezone support and data integrity.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when migration is successfully completed
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('habit_logs', (table) => {
    // Primary key with UUID
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable()
      .comment('Unique identifier for habit log entry');

    // Reference to parent habit
    table.uuid('habit_id')
      .notNullable()
      .references('id')
      .inTable('habits')
      .onDelete('CASCADE')
      .comment('Reference to the parent habit being logged');

    // Completion timestamp with timezone
    table.timestamp('completed_at', { useTz: true })
      .notNullable()
      .comment('Timestamp when habit was completed, with timezone support');

    // Completion status
    table.boolean('completed')
      .notNullable()
      .defaultTo(true)
      .comment('Flag indicating completion status of the habit');

    // Optional notes
    table.text('notes')
      .nullable()
      .comment('Optional notes about the habit completion');

    // Audit timestamp with timezone
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Record creation timestamp with timezone support');

    // Table comment
    table.comment('Stores habit completion logs with timestamps and completion status');
  });

  // Create optimized indexes
  await knex.schema.raw(`
    -- Index for efficient habit log lookups
    CREATE INDEX habit_logs_habit_id_idx 
    ON habit_logs (habit_id);

    -- Index for temporal queries and analytics
    CREATE INDEX habit_logs_completed_at_idx 
    ON habit_logs (completed_at);

    -- Composite index for filtered temporal queries
    CREATE INDEX habit_logs_habit_id_completed_at_idx 
    ON habit_logs (habit_id, completed_at);
  `);

  // Validate table structure
  await knex.schema.raw(`
    DO $$
    BEGIN
      -- Verify table exists
      IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'habit_logs'
      ) THEN
        RAISE EXCEPTION 'Table habit_logs does not exist';
      END IF;

      -- Verify foreign key constraint
      IF NOT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'habit_logs_habit_id_foreign'
      ) THEN
        RAISE EXCEPTION 'Foreign key constraint on habit_id is missing';
      END IF;
    END
    $$;
  `);
}

/**
 * Rolls back the habit_logs table creation by safely removing the table and all associated objects.
 * Ensures proper cleanup of indexes and constraints.
 * 
 * @param {Knex} knex - The Knex instance for database operations
 * @returns {Promise<void>} Resolves when rollback is successfully completed
 */
export async function down(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.schema.raw(`
    DROP INDEX IF EXISTS habit_logs_habit_id_completed_at_idx;
    DROP INDEX IF EXISTS habit_logs_completed_at_idx;
    DROP INDEX IF EXISTS habit_logs_habit_id_idx;
  `);

  // Drop the table (will cascade delete constraints)
  await knex.schema.dropTableIfExists('habit_logs');

  // Verify cleanup
  await knex.schema.raw(`
    DO $$
    BEGIN
      -- Verify table is dropped
      IF EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'habit_logs'
      ) THEN
        RAISE EXCEPTION 'Failed to drop habit_logs table';
      END IF;
    END
    $$;
  `);
}