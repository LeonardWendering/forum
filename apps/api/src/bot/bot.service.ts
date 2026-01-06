import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateBotThreadDto, CreateBotPostDto } from "./dto";

@Injectable()
export class BotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new thread as a bot
   * Bot must be a member of the subcommunity
   */
  async createThread(dto: CreateBotThreadDto, botId: string) {
    // Find subcommunity
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug: dto.subcommunitySlug }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Verify bot is a member
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_subcommunityId: {
          userId: botId,
          subcommunityId: subcommunity.id
        }
      }
    });

    if (!membership) {
      throw new ForbiddenException("Bot must be a member of this subcommunity");
    }

    // Create thread with initial post in transaction
    const thread = await this.prisma.$transaction(async (tx) => {
      const newThread = await tx.thread.create({
        data: {
          title: dto.title,
          subcommunityId: subcommunity.id,
          authorId: botId
        }
      });

      // Create the initial post (OP)
      const post = await tx.post.create({
        data: {
          content: dto.content,
          threadId: newThread.id,
          authorId: botId
        }
      });

      return { thread: newThread, post };
    });

    return {
      threadId: thread.thread.id,
      postId: thread.post.id,
      title: thread.thread.title,
      subcommunitySlug: dto.subcommunitySlug,
      createdAt: thread.thread.createdAt
    };
  }

  /**
   * Create a new post/reply as a bot
   * Bot must be a member of the thread's subcommunity
   */
  async createPost(dto: CreateBotPostDto, botId: string) {
    // Find thread and its subcommunity
    const thread = await this.prisma.thread.findUnique({
      where: { id: dto.threadId },
      include: { subcommunity: true }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    if (thread.isLocked) {
      throw new ForbiddenException("This thread is locked");
    }

    // Verify bot is a member of the subcommunity
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_subcommunityId: {
          userId: botId,
          subcommunityId: thread.subcommunityId
        }
      }
    });

    if (!membership) {
      throw new ForbiddenException("Bot must be a member of this subcommunity");
    }

    // Validate parent post if provided
    if (dto.parentPostId) {
      const parentPost = await this.prisma.post.findUnique({
        where: { id: dto.parentPostId }
      });

      if (!parentPost || parentPost.threadId !== dto.threadId) {
        throw new BadRequestException("Invalid parent post");
      }
    }

    // Create the post
    const post = await this.prisma.post.create({
      data: {
        content: dto.content,
        threadId: dto.threadId,
        authorId: botId,
        parentId: dto.parentPostId
      }
    });

    return {
      postId: post.id,
      threadId: dto.threadId,
      parentPostId: dto.parentPostId || null,
      createdAt: post.createdAt
    };
  }

  /**
   * Get bot's posting statistics
   */
  async getBotStats(botId: string) {
    const [threadCount, postCount, memberships] = await Promise.all([
      this.prisma.thread.count({ where: { authorId: botId } }),
      this.prisma.post.count({ where: { authorId: botId } }),
      this.prisma.membership.findMany({
        where: { userId: botId },
        include: {
          subcommunity: {
            select: { id: true, name: true, slug: true }
          }
        }
      })
    ]);

    return {
      botId,
      threadCount,
      postCount,
      communities: memberships.map(m => m.subcommunity)
    };
  }
}
