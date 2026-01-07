import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ForbiddenException
} from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole, ActivityType } from "@prisma/client";

@Controller("activity")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Start tracking a thread view (called when user opens a thread)
   */
  @Post("thread-view/start")
  async startThreadView(
    @CurrentUser("id") userId: string,
    @Body("threadId") threadId: string
  ) {
    const activityLogId = await this.activityService.logThreadView(userId, threadId);
    return { activityLogId };
  }

  /**
   * End tracking a thread view (called when user leaves the thread)
   */
  @Post("thread-view/end")
  async endThreadView(@Body("activityLogId") activityLogId: string) {
    if (activityLogId) {
      await this.activityService.endThreadView(activityLogId);
    }
    return { success: true };
  }

  /**
   * Get activity logs (admin only)
   */
  @Get("logs")
  async getActivityLogs(
    @CurrentUser("role") role: UserRole,
    @Query("userId") userId?: string,
    @Query("activityType") activityType?: ActivityType,
    @Query("threadId") threadId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can view activity logs");
    }

    return this.activityService.getActivityLogs(
      {
        userId,
        activityType,
        threadId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50
    );
  }

  /**
   * Get user activity summary (admin only)
   */
  @Get("summary")
  async getUserActivitySummary(
    @CurrentUser("role") role: UserRole,
    @Query("userId") userId: string
  ) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can view activity summaries");
    }

    return this.activityService.getUserActivitySummary(userId);
  }
}
