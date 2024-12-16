/**
 * @fileoverview Development environment seed file for user data.
 * Creates test users with various authentication scenarios, roles, and states
 * for comprehensive testing of authentication and authorization flows.
 * 
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.1
import * as bcrypt from 'bcrypt'; // v5.1.0
import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { AuthProvider } from '../../../auth-service/src/interfaces/auth.interface';

// User role enum matching the auth service
enum UserRole {
  USER = 'USER',
  PREMIUM = 'PREMIUM',
  ADMIN = 'ADMIN'
}

// Interface for user seed data
interface UserSeed extends BaseEntity {
  email: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  provider: AuthProvider;
  lastLoginAt: Date;
}

// Constants for test data
const BCRYPT_ROUNDS = 10;
const TEST_USER_PASSWORD = 'TestPass123!';

/**
 * Generates a test user object with specified properties
 * @param partialUser - Partial user data to override defaults
 * @returns Complete user object for seeding
 */
const createTestUser = (partialUser: Partial<UserSeed>): UserSeed => {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    email: partialUser.email || 'test@example.com',
    passwordHash: partialUser.passwordHash || '',
    role: partialUser.role || UserRole.USER,
    isEmailVerified: partialUser.isEmailVerified ?? false,
    mfaEnabled: partialUser.mfaEnabled ?? false,
    provider: partialUser.provider || AuthProvider.EMAIL,
    lastLoginAt: partialUser.lastLoginAt || now,
    createdAt: now,
    updatedAt: now
  };
};

/**
 * Seeds the users table with comprehensive test data
 * covering various authentication scenarios and user states.
 * 
 * @param knex - Knex instance
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Clean the users table
    await knex('users').del();

    // Generate password hash for test users
    const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, BCRYPT_ROUNDS);

    // Create test users array
    const users: UserSeed[] = [
      // Basic users with different email verification states
      createTestUser({
        email: 'user@example.com',
        passwordHash,
        role: UserRole.USER,
        isEmailVerified: true,
        provider: AuthProvider.EMAIL
      }),
      createTestUser({
        email: 'unverified@example.com',
        passwordHash,
        role: UserRole.USER,
        isEmailVerified: false,
        provider: AuthProvider.EMAIL
      }),

      // Premium users with different MFA states
      createTestUser({
        email: 'premium@example.com',
        passwordHash,
        role: UserRole.PREMIUM,
        isEmailVerified: true,
        mfaEnabled: true,
        provider: AuthProvider.EMAIL
      }),
      createTestUser({
        email: 'premium-nomfa@example.com',
        passwordHash,
        role: UserRole.PREMIUM,
        isEmailVerified: true,
        mfaEnabled: false,
        provider: AuthProvider.EMAIL
      }),

      // Admin users
      createTestUser({
        email: 'admin@example.com',
        passwordHash,
        role: UserRole.ADMIN,
        isEmailVerified: true,
        mfaEnabled: true,
        provider: AuthProvider.EMAIL
      }),

      // OAuth users with different providers
      createTestUser({
        email: 'google@example.com',
        passwordHash: '',  // OAuth users don't have password
        role: UserRole.USER,
        isEmailVerified: true,
        provider: AuthProvider.GOOGLE
      }),
      createTestUser({
        email: 'facebook@example.com',
        passwordHash: '',  // OAuth users don't have password
        role: UserRole.USER,
        isEmailVerified: true,
        provider: AuthProvider.FACEBOOK
      })
    ];

    // Insert users with proper timestamps
    await knex('users').insert(users);

    // Validate the seeded data
    const seededCount = await knex('users').count('id as count').first();
    console.log(`Successfully seeded ${seededCount?.count} users`);

  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

export default { seed };