import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { ActivityType } from "@prisma/client";

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user should be tracked (only invited users, NOT bot users)
   * We track real users who registered via invite codes to understand their behavior
   */
  private async shouldTrackUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isBot: true, isRestricted: true, registeredWithInviteId: true }
    });

    // Track if user is NOT a bot AND was invited (registered with invite code)
    // This tracks real research participants, not the simulated bot accounts
    return !!(user && !user.isBot && (user.isRestricted || user.registeredWithInviteId));
  }

  /**
   * Log a thread view event
   */
  async logThreadView(userId: string, threadId: string): Promise<string | null> {
    if (!(await this.shouldTrackUser(userId))) {
      return null;
    }

    const log = await this.prisma.activityLog.create({
      data: {
        userId,
        activityType: ActivityType.THREAD_VIEW,
        threadId,
        startedAt: new Date()
      }
    });

    return log.id;
  }

  /**
   * End a thread view session (update duration)
   */
  async endThreadView(activityLogId: string): Promise<void> {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: activityLogId }
    });

    if (!log) return;

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - log.startedAt.getTime();

    await this.prisma.activityLog.update({
      where: { id: activityLogId },
      data: {
        endedAt,
        durationMs
      }
    });
  }

  /**
   * Log a post creation event
   */
  async logPostCreate(
    userId: string,
    postId: string,
    threadId: string,
    metadata?: { parentId?: string | null }
  ): Promise<void> {
    if (!(await this.shouldTrackUser(userId))) {
      return;
    }

    await this.prisma.activityLog.create({
      data: {
        userId,
        activityType: ActivityType.POST_CREATE,
        postId,
        threadId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined
      }
    });
  }

  /**
   * Log a message send event
   */
  async logMessageSend(
    userId: string,
    messageId: string,
    conversationId: string
  ): Promise<void> {
    if (!(await this.shouldTrackUser(userId))) {
      return;
    }

    await this.prisma.activityLog.create({
      data: {
        userId,
        activityType: ActivityType.MESSAGE_SEND,
        messageId,
        conversationId
      }
    });
  }

  /**
   * Log a message read event
   */
  async logMessageRead(
    userId: string,
    messageId: string,
    conversationId: string
  ): Promise<void> {
    if (!(await this.shouldTrackUser(userId))) {
      return;
    }

    await this.prisma.activityLog.create({
      data: {
        userId,
        activityType: ActivityType.MESSAGE_READ,
        messageId,
        conversationId
      }
    });
  }

  /**
   * Get activity logs for admin viewing
   */
  async getActivityLogs(
    filters: {
      userId?: string;
      activityType?: ActivityType;
      threadId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    limit = 50
  ) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.activityType) where.activityType = filters.activityType;
    if (filters.threadId) where.threadId = filters.threadId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
      if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              isBot: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      this.prisma.activityLog.count({ where })
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        user: log.user,
        activityType: log.activityType,
        threadId: log.threadId,
        postId: log.postId,
        messageId: log.messageId,
        conversationId: log.conversationId,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        durationMs: log.durationMs,
        metadata: log.metadata,
        createdAt: log.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user activity summary for admin viewing
   */
  async getUserActivitySummary(userId: string) {
    const [threadViews, posts, messagesSent, messagesRead] = await Promise.all([
      this.prisma.activityLog.count({
        where: { userId, activityType: ActivityType.THREAD_VIEW }
      }),
      this.prisma.activityLog.count({
        where: { userId, activityType: ActivityType.POST_CREATE }
      }),
      this.prisma.activityLog.count({
        where: { userId, activityType: ActivityType.MESSAGE_SEND }
      }),
      this.prisma.activityLog.count({
        where: { userId, activityType: ActivityType.MESSAGE_READ }
      })
    ]);

    // Calculate average view duration
    const viewDurations = await this.prisma.activityLog.aggregate({
      where: {
        userId,
        activityType: ActivityType.THREAD_VIEW,
        durationMs: { not: null }
      },
      _avg: { durationMs: true },
      _sum: { durationMs: true }
    });

    return {
      userId,
      threadViews,
      posts,
      messagesSent,
      messagesRead,
      averageViewDurationMs: viewDurations._avg.durationMs || 0,
      totalViewDurationMs: viewDurations._sum.durationMs || 0
    };
  }
}
