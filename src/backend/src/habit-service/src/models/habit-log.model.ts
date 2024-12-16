/**
 * @fileoverview Defines the database model and schema for habit completion logs.
 * Implements a comprehensive data structure for tracking individual habit completion
 * records with timestamps, user attribution, and optional notes.
 * 
 * @version 1.0.0
 */

import { Entity, Column, Index } from 'typeorm'; // v0.3.0
import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Interface representing a complete habit completion log entry
 * with all required and optional fields
 */
export interface HabitLog extends BaseEntity {
  /** ID of the habit this log entry belongs to */
  habitId: string;
  
  /** ID of the user who created this log entry */
  userId: string;
  
  /** Timestamp when the habit was marked as completed */
  completedAt: Date;
  
  /** Whether the habit was completed successfully */
  completed: boolean;
  
  /** Optional notes or comments about the completion */
  notes: string | null;
}

/**
 * Data transfer object for creating new habit log entries
 * with validation constraints
 */
export interface CreateHabitLogDTO {
  /** ID of the habit being logged */
  habitId: string;
  
  /** Completion status of the habit */
  completed: boolean;
  
  /** Optional notes about the completion (max 500 chars) */
  notes?: string | null;
}

/**
 * Database model class for habit log entries with validation and indexing
 */
@Entity('habit_logs')
@Index(['habitId', 'userId'])
@Index(['completedAt'])
export class HabitLogModel implements HabitLog {
  @Column('uuid', { primary: true, generated: 'uuid' })
  readonly id!: string;

  @Column('uuid')
  readonly habitId!: string;

  @Column('uuid')
  readonly userId!: string;

  @Column('timestamp with time zone')
  readonly completedAt!: Date;

  @Column('boolean')
  readonly completed!: boolean;

  @Column('text', { nullable: true })
  readonly notes!: string | null;

  @Column('timestamp with time zone')
  readonly createdAt!: Date;

  @Column('timestamp with time zone')
  updatedAt!: Date;

  /**
   * Creates a new habit log model instance with validation
   * 
   * @param data - The habit log data transfer object
   * @param userId - The ID of the user creating the log
   * @throws {Error} If required fields are missing or invalid
   */
  constructor(data: CreateHabitLogDTO, userId: string) {
    if (!data.habitId || !userId) {
      throw new Error('HabitId and userId are required');
    }

    // Initialize base entity fields
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Set habit log specific fields
    this.habitId = data.habitId;
    this.userId = userId;
    this.completedAt = new Date();
    this.completed = data.completed;

    // Validate and set notes
    if (data.notes && data.notes.length > 500) {
      throw new Error('Notes cannot exceed 500 characters');
    }
    this.notes = data.notes || null;
  }
}