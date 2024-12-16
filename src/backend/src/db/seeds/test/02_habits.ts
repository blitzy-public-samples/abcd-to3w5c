/**
 * @fileoverview Test seed file for populating the habits table with predefined test data.
 * Provides comprehensive coverage of habit configurations for integration testing.
 * 
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.1
import { Habit, FrequencyType } from '../../../habit-service/src/interfaces/habit.interface';

/**
 * Comprehensive test data covering various habit configurations and edge cases
 */
const TEST_HABITS: Partial<Habit>[] = [
  {
    name: 'Morning Meditation',
    description: '10 minutes of mindfulness meditation',
    frequency: {
      type: FrequencyType.DAILY,
      value: 1,
      days: [],
      customSchedule: null
    },
    reminderTime: new Date('2023-01-01T08:00:00Z'),
    isActive: true
  },
  {
    name: 'Weekly Exercise',
    description: '30 minutes cardio workout',
    frequency: {
      type: FrequencyType.WEEKLY,
      value: 3,
      days: [1, 3, 5], // Monday, Wednesday, Friday
      customSchedule: null
    },
    reminderTime: new Date('2023-01-01T17:00:00Z'),
    isActive: true
  },
  {
    name: 'Monthly Review',
    description: 'Personal goals and habits review',
    frequency: {
      type: FrequencyType.CUSTOM,
      value: 1,
      days: [1], // First day of each month
      customSchedule: {
        time: '10:00',
        days: [1]
      }
    },
    reminderTime: new Date('2023-01-01T10:00:00Z'),
    isActive: true
  },
  {
    name: 'Evening Reading',
    description: 'Read for personal development',
    frequency: {
      type: FrequencyType.DAILY,
      value: 1,
      days: [],
      customSchedule: null
    },
    reminderTime: new Date('2023-01-01T21:00:00Z'),
    isActive: false
  },
  {
    name: 'Weekend Meal Prep',
    description: 'Prepare meals for the week',
    frequency: {
      type: FrequencyType.WEEKLY,
      value: 1,
      days: [0], // Sunday
      customSchedule: null
    },
    reminderTime: new Date('2023-01-01T14:00:00Z'),
    isActive: true
  }
];

/**
 * Seeds the habits table with comprehensive test data.
 * Implements proper cleanup, foreign key handling, and indexing.
 * 
 * @param knex - Knex instance for database operations
 * @returns Promise resolving when seeding is complete
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction for atomic operations
    await knex.transaction(async (trx) => {
      // Clean existing records with CASCADE
      await trx('habits').del();

      // Get test user IDs from the users table
      const users = await trx('users')
        .select('id')
        .orderBy('created_at', 'asc')
        .limit(1);

      if (!users.length) {
        throw new Error('No test users found. Please run the users seed first.');
      }

      const userId = users[0].id;

      // Prepare habit records with user association and timestamps
      const habitRecords = TEST_HABITS.map(habit => ({
        ...habit,
        userId,
        frequency: JSON.stringify(habit.frequency),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Insert habits in batches for better performance
      const BATCH_SIZE = 100;
      for (let i = 0; i < habitRecords.length; i += BATCH_SIZE) {
        const batch = habitRecords.slice(i, i + BATCH_SIZE);
        await trx('habits').insert(batch);
      }

      // Create indexes for efficient querying
      const indexExists = await trx.schema.hasIndex('habits', 'idx_habits_user_active');
      if (!indexExists) {
        await trx.schema.alterTable('habits', (table) => {
          table.index(['userId', 'isActive'], 'idx_habits_user_active');
          table.index('reminderTime', 'idx_habits_reminder_time');
        });
      }
    });

    console.log('Successfully seeded habits table with test data');
  } catch (error) {
    console.error('Error seeding habits table:', error);
    throw error;
  }
}

export default seed;