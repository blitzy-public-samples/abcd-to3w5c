/**
 * @fileoverview Implements the Habit model class for the habit tracking service using Objection.js ORM.
 * Provides comprehensive database schema definition, validation rules, and model methods for habit entities
 * with full TypeScript type safety.
 * 
 * @version 1.0.0
 */

import { Model, ModelObject, JSONSchema } from 'objection'; // v3.0.1
import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { 
  Habit, 
  FrequencyType, 
  HabitFrequency, 
  isValidFrequencyType, 
  isValidHabitFrequency 
} from '../interfaces/habit.interface';

/**
 * Database table name constant for habits
 */
const TABLE_NAME = 'habits';

/**
 * Objection.js model class for habits with comprehensive validation and type safety.
 * Implements both Habit and BaseEntity interfaces for complete type coverage.
 */
export class HabitModel extends Model implements Habit, BaseEntity {
  // Required properties from BaseEntity
  readonly id!: string;
  readonly createdAt!: Date;
  updatedAt!: Date;

  // Required properties from Habit interface
  userId!: string;
  name!: string;
  description!: string;
  frequency!: HabitFrequency;
  reminderTime!: Date | null;
  isActive!: boolean;

  /**
   * Static getter for the database table name
   */
  static get tableName(): string {
    return TABLE_NAME;
  }

  /**
   * Comprehensive JSON schema for validation of habit entities
   * Implements strict validation rules for all fields
   */
  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['userId', 'name', 'description', 'frequency'],
      properties: {
        // Base entity fields
        id: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },

        // Habit-specific fields
        userId: { type: 'string', format: 'uuid' },
        name: { 
          type: 'string', 
          minLength: 1,
          maxLength: 100,
        },
        description: { 
          type: 'string',
          maxLength: 500,
        },
        frequency: {
          type: 'object',
          required: ['type', 'value', 'days'],
          properties: {
            type: { 
              type: 'string',
              enum: Object.values(FrequencyType)
            },
            value: { 
              type: 'integer',
              minimum: 1
            },
            days: {
              type: 'array',
              items: {
                type: 'integer',
                minimum: 0,
                maximum: 6
              }
            },
            customSchedule: {
              type: ['object', 'null'],
              properties: {
                time: { 
                  type: 'string',
                  pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$'
                },
                days: {
                  type: 'array',
                  items: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 6
                  }
                }
              },
              required: ['time', 'days']
            }
          }
        },
        reminderTime: { 
          type: ['string', 'null'],
          format: 'date-time'
        },
        isActive: { type: 'boolean' }
      },
      additionalProperties: false
    };
  }

  /**
   * Constructor for creating new habit instances with proper type checking
   * @param data - The habit data to initialize the model with
   */
  constructor(data?: ModelObject<HabitModel>) {
    super(data);

    // Set default values for required fields
    this.isActive = data?.isActive ?? true;
    
    // Initialize timestamps if not provided
    const now = new Date();
    this.createdAt = data?.createdAt ? new Date(data.createdAt) : now;
    this.updatedAt = data?.updatedAt ? new Date(data.updatedAt) : now;

    // Convert reminderTime string to Date if provided
    if (data?.reminderTime) {
      this.reminderTime = new Date(data.reminderTime);
    }

    // Validate frequency if provided
    if (data?.frequency) {
      if (!isValidFrequencyType(data.frequency.type)) {
        throw new Error('Invalid frequency type');
      }
      if (!isValidHabitFrequency(data.frequency)) {
        throw new Error('Invalid frequency configuration');
      }
    }
  }

  /**
   * Custom validation before save to ensure data integrity
   */
  async $beforeInsert(): Promise<void> {
    await super.$beforeInsert();
    this.updatedAt = new Date();
    this.createdAt = new Date();
  }

  /**
   * Custom validation before update to maintain data integrity
   */
  async $beforeUpdate(): Promise<void> {
    await super.$beforeUpdate();
    this.updatedAt = new Date();
  }
}