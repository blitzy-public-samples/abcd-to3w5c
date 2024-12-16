/**
 * @fileoverview Test seed file for populating users table with predefined test data.
 * Provides consistent test data for integration testing of user-related functionality.
 * 
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.1
import * as bcrypt from 'bcrypt'; // v5.1.0
import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { UserRole, UserPreferences } from '../../../auth-service/src/interfaces/auth.interface';

/**
 * Interface extending BaseEntity for user test data structure
 */
interface TestUser extends BaseEntity {
  email: string;
  passwordHash: string;
  role: UserRole;
  preferences: UserPreferences;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
}

/**
 * Test user data with different roles and preferences
 */
const TEST_USERS: Omit<TestUser, keyof BaseEntity | 'passwordHash'>[] = [
  {
    email: 'test.user@example.com',
    role: 'USER',
    preferences: {
      theme: 'light',
      notifications: true,
      weeklyReport: true
    },
    isEmailVerified: true,
    lastLoginAt: new Date('2023-01-01T00:00:00Z')
  },
  {
    email: 'test.premium@example.com',
    role: 'PREMIUM',
    preferences: {
      theme: 'dark',
      notifications: true,
      weeklyReport: true,
      analyticsAccess: true
    },
    isEmailVerified: true,
    lastLoginAt: new Date('2023-01-02T00:00:00Z')
  },
  {
    email: 'test.admin@example.com',
    role: 'ADMIN',
    preferences: {
      theme: 'system',
      notifications: true,
      weeklyReport: true,
      analyticsAccess: true,
      adminDashboard: true
    },
    isEmailVerified: true,
    lastLoginAt: new Date('2023-01-03T00:00:00Z')
  },
  {
    email: 'test.unverified@example.com',
    role: 'USER',
    preferences: {
      theme: 'light',
      notifications: false,
      weeklyReport: false
    },
    isEmailVerified: false,
    lastLoginAt: null
  }
];

/**
 * Test passwords for each user type
 * Note: In production, never store plain-text passwords
 */
const TEST_PASSWORDS = {
  USER: 'Test123!',
  PREMIUM: 'Premium123!',
  ADMIN: 'Admin123!'
};

/**
 * Seeds the users table with test data
 * @param knex - Knex instance
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Clear existing entries with cascading delete
    await knex.raw('TRUNCATE TABLE users CASCADE');

    // Generate test users with hashed passwords
    const saltRounds = 10;
    const now = new Date();

    const usersToInsert = await Promise.all(
      TEST_USERS.map(async (user) => {
        const password = TEST_PASSWORDS[user.role as keyof typeof TEST_PASSWORDS] || TEST_PASSWORDS.USER;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        return {
          id: knex.raw('uuid_generate_v4()'),
          email: user.email,
          passwordHash,
          role: user.role,
          preferences: JSON.stringify(user.preferences),
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: now,
          updatedAt: now
        };
      })
    );

    // Insert test users
    await knex('users').insert(usersToInsert);

    // Verify insertion
    const insertedCount = await knex('users').count('id as count').first();
    if (insertedCount && Number(insertedCount.count) !== TEST_USERS.length) {
      throw new Error('Failed to insert all test users');
    }

    console.log(`Successfully seeded ${TEST_USERS.length} test users`);
  } catch (error) {
    console.error('Error seeding test users:', error);
    throw error;
  }
}

export default { seed };