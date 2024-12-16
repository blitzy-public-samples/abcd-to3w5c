/**
 * @fileoverview Migration file for creating the achievements table with comprehensive
 * support for tracking user achievements, milestones, and progress.
 * 
 * @version 1.0.0
 * @requires knex@^2.5.1
 */

import { Knex } from 'knex'; // v2.5.1
import { BaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Creates the achievements table with all necessary columns, constraints,
 * indexes, and triggers for tracking user achievements and progress.
 */
export async function up(knex: Knex): Promise<void> {
  // Create achievements table
  await knex.schema.createTable('achievements', (table) => {
    // Primary key using UUID
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable()
      .comment('Unique identifier for the achievement');

    // Foreign key relationships
    table.uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .comment('Reference to the user who earned/is pursuing the achievement');

    table.uuid('habit_id')
      .nullable()
      .references('id')
      .inTable('habits')
      .onDelete('SET NULL')
      .onUpdate('CASCADE')
      .comment('Optional reference to a specific habit this achievement is tied to');

    // Achievement details
    table.string('type', 50)
      .notNullable()
      .comment('Category/type of achievement (e.g., streak, completion, milestone)');

    table.string('title', 255)
      .notNullable()
      .comment('Display title of the achievement');

    table.text('description')
      .notNullable()
      .comment('Detailed description of the achievement and how to earn it');

    table.integer('progress')
      .notNullable()
      .defaultTo(0)
      .comment('Current progress towards completing the achievement (0-100)');

    table.jsonb('criteria')
      .notNullable()
      .defaultTo('{}')
      .comment('JSON object containing achievement completion criteria');

    table.timestamp('awarded_at')
      .nullable()
      .comment('Timestamp when the achievement was completed/awarded');

    // Audit timestamps
    table.timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when the achievement was created');

    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when the achievement was last updated');
  });

  // Create indexes for efficient querying
  await knex.schema.raw(`
    CREATE INDEX idx_achievements_user_id ON achievements (user_id);
    CREATE INDEX idx_achievements_habit_id ON achievements (habit_id);
    CREATE INDEX idx_achievements_type ON achievements (type);
    CREATE INDEX idx_achievements_awarded_at ON achievements (awarded_at);
    CREATE INDEX idx_achievements_progress ON achievements (progress);
  `);

  // Create trigger for automatic updated_at timestamp
  await knex.schema.raw(`
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON achievements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);

  // Create index on JSONB criteria for efficient querying of achievement rules
  await knex.schema.raw(`
    CREATE INDEX idx_achievements_criteria ON achievements USING gin (criteria jsonb_path_ops);
  `);
}

/**
 * Rolls back the achievements table creation by removing all associated
 * objects in the correct order to maintain referential integrity.
 */
export async function down(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.schema.raw(`
    DROP INDEX IF EXISTS idx_achievements_user_id;
    DROP INDEX IF EXISTS idx_achievements_habit_id;
    DROP INDEX IF EXISTS idx_achievements_type;
    DROP INDEX IF EXISTS idx_achievements_awarded_at;
    DROP INDEX IF EXISTS idx_achievements_progress;
    DROP INDEX IF EXISTS idx_achievements_criteria;
  `);

  // Drop trigger
  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS set_timestamp ON achievements;
  `);

  // Drop the table with CASCADE option to clean up any dependencies
  await knex.schema.dropTableIfExists('achievements');
}