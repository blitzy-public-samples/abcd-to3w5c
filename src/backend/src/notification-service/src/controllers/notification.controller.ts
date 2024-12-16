/**
 * @fileoverview Controller handling notification-related HTTP endpoints with comprehensive
 * error handling, rate limiting, and caching capabilities for the habit tracking application.
 * 
 * @version 1.0.0
 */

import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  UseInterceptors,
  Logger,
  HttpStatus
} from '@nestjs/common'; // ^9.0.0
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiSecurity,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger'; // ^6.0.0
import { NotificationService } from '../services/notification.service';
import { 
  NotificationType, 
  NotificationStatus, 
  NotificationPreference, 
  Notification 
} from '../interfaces/notification.interface';
import { 
  createSuccessResponse, 
  createErrorResponse 
} from '../../../shared/utils/response.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { AuthGuard } from '../guards/auth.guard';
import { CacheInterceptor } from '../interceptors/cache.interceptor';
import { ValidationPipe } from '../pipes/validation.pipe';

/**
 * Interface for pagination parameters
 */
interface PaginationParams {
  page: number;
  limit: number;
  status?: NotificationStatus;
  type?: NotificationType;
}

/**
 * Controller responsible for handling all notification-related endpoints
 */
@Controller('notifications')
@ApiTags('notifications')
@ApiSecurity('bearer')
@UseGuards(AuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Sends a new notification with rate limiting and validation
   */
  @Post()
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Send a new notification' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Notification sent successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid notification data' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async sendNotification(
    @Body(new ValidationPipe()) notification: Notification
  ) {
    try {
      this.logger.debug(`Sending notification: ${JSON.stringify(notification)}`);
      
      await this.notificationService.sendNotification(notification);
      
      return createSuccessResponse(null, 'Notification sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`, error.stack);
      
      return createErrorResponse(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Failed to send notification',
        { notificationType: notification.type }
      );
    }
  }

  /**
   * Retrieves paginated user notifications with caching
   */
  @Get(':userId')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiQuery({ name: 'status', enum: NotificationStatus, required: false })
  @ApiQuery({ name: 'type', enum: NotificationType, required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'User notifications retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query() params: PaginationParams
  ) {
    try {
      this.logger.debug(`Retrieving notifications for user: ${userId}`);
      
      const notifications = await this.notificationService.getUserNotifications(userId);
      
      // Apply pagination and filtering
      const paginatedResults = this.paginateAndFilterNotifications(
        notifications,
        params
      );
      
      return createSuccessResponse(paginatedResults);
    } catch (error) {
      this.logger.error(`Failed to retrieve notifications: ${error.message}`, error.stack);
      
      return createErrorResponse(
        ErrorCodes.SYSTEM_ERROR,
        'Failed to retrieve notifications',
        { userId }
      );
    }
  }

  /**
   * Updates user notification preferences with validation
   */
  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Preferences updated successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid preference data' })
  async updateNotificationPreferences(
    @Body(new ValidationPipe()) preferences: NotificationPreference
  ) {
    try {
      this.logger.debug(`Updating preferences for user: ${preferences.userId}`);
      
      await this.notificationService.updateNotificationPreferences(preferences);
      
      return createSuccessResponse(null, 'Notification preferences updated successfully');
    } catch (error) {
      this.logger.error(`Failed to update preferences: ${error.message}`, error.stack);
      
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Failed to update notification preferences',
        { userId: preferences.userId }
      );
    }
  }

  /**
   * Helper method to paginate and filter notifications
   */
  private paginateAndFilterNotifications(
    notifications: Notification[],
    params: PaginationParams
  ) {
    let filtered = [...notifications];

    // Apply status filter
    if (params.status) {
      filtered = filtered.filter(n => n.status === params.status);
    }

    // Apply type filter
    if (params.type) {
      filtered = filtered.filter(n => n.type === params.type);
    }

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      data: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      page,
      limit,
      hasMore: endIndex < filtered.length
    };
  }
}