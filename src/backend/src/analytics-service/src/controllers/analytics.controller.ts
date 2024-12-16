/**
 * @fileoverview Analytics Controller handling HTTP/gRPC requests for analytics operations
 * with enhanced performance monitoring, caching, and error handling.
 * 
 * @version 1.0.0
 * @requires @nestjs/common@9.0.0
 * @requires @nestjs/swagger@6.0.0
 * @requires @nestjs/cache-manager@1.0.0
 */

import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseInterceptors,
  HttpException,
  HttpStatus,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery,
  ApiParam 
} from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

import { AnalyticsService } from '../services/analytics.service';
import { 
  HabitAnalytics, 
  UserAnalytics, 
  AnalyticsTimeframe, 
  TimeGranularity,
  HeatmapData,
  AnalyticsTrend
} from '../interfaces/analytics.interface';
import { createSuccessResponse, createErrorResponse } from '../../../shared/utils/response.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { UUID } from '../../../shared/interfaces/base.interface';

@Controller('analytics')
@ApiTags('Analytics')
@UseInterceptors(CacheInterceptor)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Retrieves comprehensive analytics data for a specific user
   */
  @Get('users/:userId')
  @CacheTTL(300) // 5 minutes cache
  @ApiOperation({ summary: 'Get user analytics data' })
  @ApiParam({ name: 'userId', type: String, description: 'User UUID' })
  @ApiQuery({ name: 'timeframe', enum: AnalyticsTimeframe, required: false })
  @ApiResponse({ status: 200, type: UserAnalytics })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserAnalytics(
    @Param('userId') userId: UUID,
    @Query('timeframe') timeframe: AnalyticsTimeframe = AnalyticsTimeframe.MONTHLY
  ) {
    try {
      const analytics = await this.analyticsService.getUserAnalytics(userId, timeframe);
      return createSuccessResponse(analytics, 'User analytics retrieved successfully');
    } catch (error) {
      throw new HttpException(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          'Failed to retrieve user analytics',
          { userId, timeframe }
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves detailed analytics for a specific habit
   */
  @Get('habits/:habitId')
  @CacheTTL(300)
  @ApiOperation({ summary: 'Get habit analytics data' })
  @ApiParam({ name: 'habitId', type: String, description: 'Habit UUID' })
  @ApiQuery({ name: 'timeframe', enum: AnalyticsTimeframe, required: false })
  @ApiResponse({ status: 200, type: HabitAnalytics })
  async getHabitAnalytics(
    @Param('habitId') habitId: UUID,
    @Query('timeframe') timeframe: AnalyticsTimeframe = AnalyticsTimeframe.MONTHLY
  ) {
    try {
      const analytics = await this.analyticsService.getHabitAnalytics(habitId, timeframe);
      return createSuccessResponse(analytics, 'Habit analytics retrieved successfully');
    } catch (error) {
      throw new HttpException(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          'Failed to retrieve habit analytics',
          { habitId, timeframe }
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generates heatmap visualization data for a habit
   */
  @Get('habits/:habitId/heatmap')
  @CacheTTL(600) // 10 minutes cache
  @ApiOperation({ summary: 'Get habit heatmap data' })
  @ApiParam({ name: 'habitId', type: String, description: 'Habit UUID' })
  @ApiQuery({ name: 'startDate', type: String, required: true })
  @ApiQuery({ name: 'endDate', type: String, required: true })
  @ApiResponse({ status: 200, type: [HeatmapData] })
  async getHeatmapData(
    @Param('habitId') habitId: UUID,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new HttpException(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Invalid date format',
            { startDate, endDate }
          ),
          HttpStatus.BAD_REQUEST
        );
      }

      const heatmapData = await this.analyticsService.getHeatmapData(habitId, start, end);
      return createSuccessResponse(heatmapData, 'Heatmap data retrieved successfully');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      throw new HttpException(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          'Failed to generate heatmap data',
          { habitId, startDate, endDate }
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculates trend analysis for a habit
   */
  @Get('habits/:habitId/trends')
  @CacheTTL(300)
  @ApiOperation({ summary: 'Get habit trend analysis' })
  @ApiParam({ name: 'habitId', type: String, description: 'Habit UUID' })
  @ApiQuery({ name: 'granularity', enum: TimeGranularity, required: false })
  @ApiResponse({ status: 200, type: AnalyticsTrend })
  async getTrendAnalysis(
    @Param('habitId') habitId: UUID,
    @Query('granularity') granularity: TimeGranularity = TimeGranularity.DAILY
  ) {
    try {
      const trends = await this.analyticsService.getTrendAnalysis(habitId, granularity);
      return createSuccessResponse(trends, 'Trend analysis retrieved successfully');
    } catch (error) {
      throw new HttpException(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          'Failed to calculate trend analysis',
          { habitId, granularity }
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves weekly progress data for a habit
   */
  @Get('habits/:habitId/weekly-progress')
  @CacheTTL(300)
  @ApiOperation({ summary: 'Get habit weekly progress' })
  @ApiParam({ name: 'habitId', type: String, description: 'Habit UUID' })
  @ApiResponse({ status: 200, description: 'Weekly progress data' })
  async getWeeklyProgress(
    @Param('habitId') habitId: UUID
  ) {
    try {
      const weeklyProgress = await this.analyticsService.getWeeklyProgress(habitId);
      return createSuccessResponse(weeklyProgress, 'Weekly progress retrieved successfully');
    } catch (error) {
      throw new HttpException(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          'Failed to retrieve weekly progress',
          { habitId }
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}