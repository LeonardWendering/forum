import {
  Injectable,
  NotFoundException,
  ForbiddenException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateThreadDto, UpdateThreadDto } from "./dto";
import { SubcommunityType, UserRole } from "@prisma/client";

@Injectable()
export class ThreadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(subcommunitySlug: string, dto: CreateThreadDto, userId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug: subcommunitySlug }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Check membership for non-public subcommunities
    if (subcommunity.type !== SubcommunityType.PUBLIC) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_subcommunityId: {
            userId,
            subcommunityId: subcommunity.id
          }
        }
      });

      if (!membership) {
        throw new ForbiddenException("You must be a member to create threads");
      }
    }

    // Create thread with initial post in transaction
    const thread = await this.prisma.$transaction(async (tx) => {
      const newThread = await tx.thread.create({
        data: {
          title: dto.title,
          subcommunityId: subcommunity.id,
          authorId: userId
        }
      });

      // Create the initial post (OP)
      await tx.post.create({
        data: {
          content: dto.content,
          threadId: newThread.id,
          authorId: userId
        }
      });

      return newThread;
    });

    return this.findById(thread.id, userId);
  }

  async findBySubcommunity(
    subcommunitySlug: string,
    userId?: string,
    userRole?: UserRole,
    isRestricted?: boolean,
    restrictedToSubcommunityId?: string | null,
    page = 1,
    limit = 20
  ) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug: subcommunitySlug },
      include: {
        memberships: userId
          ? {
              where: { userId },
              select: { role: true }
            }
          : false
      }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Check if muted (only admins can see muted subcommunities)
    if (subcommunity.isMuted && userRole !== UserRole.ADMIN) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Check if restricted user is trying to access a different subcommunity
    if (isRestricted && restrictedToSubcommunityId && subcommunity.id !== restrictedToSubcommunityId) {
      throw new ForbiddenException("You do not have access to this subcommunity");
    }

    const isMember = !!(userId && subcommunity.memberships?.length);

    // Check membership for password-protected subcommunities
    if (subcommunity.type === SubcommunityType.PASSWORD_PROTECTED && !isMember) {
      throw new ForbiddenException("You must join this subcommunity to view threads");
    }

    // Check membership for invite-only subcommunities
    if (subcommunity.type === SubcommunityType.INVITE_ONLY && !isMember) {
      throw new ForbiddenException("This subcommunity is invite-only");
    }

    const skip = (page - 1) * limit;

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        where: {
          subcommunityId: subcommunity.id,
          // Filter out muted threads for non-admins
          ...(userRole !== UserRole.ADMIN && { isMuted: false })
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true
            }
          },
          _count: {
            select: { posts: true }
          },
          posts: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              content: true,
              createdAt: true,
              votes: userRole === UserRole.ADMIN ? true : false
            }
          }
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit
      }),
      this.prisma.thread.count({
        where: {
          subcommunityId: subcommunity.id,
          ...(userRole !== UserRole.ADMIN && { isMuted: false })
        }
      })
    ]);

    return {
      threads: threads.map((thread) => {
        const firstPost = thread.posts[0];
        const voteScore =
          userRole === UserRole.ADMIN && firstPost?.votes
            ? firstPost.votes.reduce((sum, v) => sum + v.value, 0)
            : undefined;

        return {
          id: thread.id,
          title: thread.title,
          author: thread.author,
          isMuted: thread.isMuted,
          isPinned: thread.isPinned,
          isLocked: thread.isLocked,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          postCount: thread._count.posts,
          preview: firstPost?.content.substring(0, 200),
          ...(voteScore !== undefined && { voteScore })
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(threadId: string, userId?: string, userRole?: UserRole) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true
          }
        },
        subcommunity: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: { posts: true }
        }
      }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    if (thread.isMuted && userRole !== UserRole.ADMIN) {
      throw new NotFoundException("Thread not found");
    }

    return {
      id: thread.id,
      title: thread.title,
      author: thread.author,
      subcommunity: thread.subcommunity,
      isMuted: thread.isMuted,
      isPinned: thread.isPinned,
      isLocked: thread.isLocked,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      postCount: thread._count.posts
    };
  }

  async update(threadId: string, dto: UpdateThreadDto, userId: string, userRole: UserRole) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        subcommunity: {
          include: {
            memberships: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const isAuthor = thread.authorId === userId;
    const isModerator = thread.subcommunity.memberships[0]?.role === "moderator";
    const isAdmin = userRole === UserRole.ADMIN;

    // Only author can change title
    if (dto.title !== undefined && !isAuthor) {
      throw new ForbiddenException("Only the author can change the title");
    }

    // Only moderators/admins can pin/lock
    if ((dto.isPinned !== undefined || dto.isLocked !== undefined) && !isModerator && !isAdmin) {
      throw new ForbiddenException("Only moderators can pin or lock threads");
    }

    await this.prisma.thread.update({
      where: { id: threadId },
      data: {
        title: dto.title,
        isPinned: dto.isPinned,
        isLocked: dto.isLocked
      }
    });

    return this.findById(threadId, userId, userRole);
  }

  async delete(threadId: string, userId: string, userRole: UserRole) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        subcommunity: {
          include: {
            memberships: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const isAuthor = thread.authorId === userId;
    const isModerator = thread.subcommunity.memberships[0]?.role === "moderator";
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAuthor && !isModerator && !isAdmin) {
      throw new ForbiddenException("You cannot delete this thread");
    }

    await this.prisma.thread.delete({
      where: { id: threadId }
    });

    return { message: "Thread deleted successfully" };
  }
}
