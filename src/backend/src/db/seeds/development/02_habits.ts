/**
 * @fileoverview Development seed file for habits table
 * Populates the database with diverse test habits for development and testing
 * Version: 1.0.0
 */

import { Knex } from 'knex'; // v2.5.1
import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Interface representing a habit entity with all required fields
 */
interface HabitEntity extends BaseEntity {
  userId: string;
  name: string;
  description: string;
  frequency: {
    type: 'daily' | 'weekly' | 'monthly';
    days: number[];
  };
  reminderTime: string;
  isActive: boolean;
}

// Constants for habit generation
const HABIT_TYPES = ['daily', 'weekly', 'monthly'] as const;
const REMINDER_TIMES = ['08:00:00', '14:00:00', '20:00:00'] as const;

/**
 * Pre-defined test habits covering various scenarios and configurations
 */
const TEST_HABITS: Omit<HabitEntity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Morning Meditation',
    description: '15 minutes of mindfulness meditation',
    frequency: {
      type: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7]
    },
    reminderTime: '08:00:00',
    isActive: true
  },
  {
    name: 'Daily Exercise',
    description: '30 minutes of physical activity',
    frequency: {
      type: 'daily',
      days: [1, 2, 3, 4, 5]
    },
    reminderTime: '14:00:00',
    isActive: true
  },
  {
    name: 'Evening Reading',
    description: 'Read for 30 minutes',
    frequency: {
      type: 'daily',
      days: [1, 2, 3, 4, 5, 6, 7]
    },
    reminderTime: '20:00:00',
    isActive: true
  },
  {
    name: 'Weekly Planning',
    description: 'Plan goals and tasks for the week',
    frequency: {
      type: 'weekly',
      days: [1] // Monday
    },
    reminderTime: '08:00:00',
    isActive: true
  },
  {
    name: 'Gym Workout',
    description: 'Strength training session',
    frequency: {
      type: 'weekly',
      days: [2, 4, 6] // Tuesday, Thursday, Saturday
    },
    reminderTime: '14:00:00',
    isActive: true
  },
  {
    name: 'Monthly Review',
    description: 'Review and adjust monthly goals',
    frequency: {
      type: 'monthly',
      days: [1] // First day of month
    },
    reminderTime: '14:00:00',
    isActive: true
  },
  {
    name: 'Inactive Habit',
    description: 'A test habit in inactive state',
    frequency: {
      type: 'daily',
      days: [1, 2, 3, 4, 5]
    },
    reminderTime: '08:00:00',
    isActive: false
  }
];

/**
 * Seeds the habits table with test data
 * @param knex - Knex instance for database operations
 * @returns Promise that resolves when seeding is complete
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction for atomic operation
    await knex.transaction(async (trx) => {
      // Clear existing habits
      await trx('habits').del();

      // Get all user IDs for reference
      const users = await trx('users').select('id');
      
      if (!users.length) {
        throw new Error('No users found. Please run users seed first.');
      }

      // Generate habits for each user
      const habitsToInsert = users.flatMap(user => 
        TEST_HABITS.map(habit => ({
          id: knex.raw('uuid_generate_v4()'),
          userId: user.id,
          ...habit,
          frequency: JSON.stringify(habit.frequency),
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );

      // Insert all habits
      await trx('habits').insert(habitsToInsert);

      console.log(`Successfully seeded ${habitsToInsert.length} habits`);
    });
  } catch (error) {
    console.error('Error seeding habits:', error);
    throw error; // Re-throw to trigger rollback
  }
}

/**
 * Default export for Knex seed runner
 */
export default { seed };