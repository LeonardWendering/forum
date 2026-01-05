import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreatePostDto, UpdatePostDto, VoteDto } from "./dto";
import { UserRole } from "@prisma/client";

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(threadId: string, dto: CreatePostDto, userId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: { subcommunity: true }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    if (thread.isLocked) {
      throw new ForbiddenException("This thread is locked");
    }

    // Validate parent post if provided
    if (dto.parentId) {
      const parentPost = await this.prisma.post.findUnique({
        where: { id: dto.parentId }
      });

      if (!parentPost || parentPost.threadId !== threadId) {
        throw new BadRequestException("Invalid parent post");
      }
    }

    const post = await this.prisma.post.create({
      data: {
        content: dto.content,
        threadId,
        authorId: userId,
        parentId: dto.parentId
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    return {
      id: post.id,
      content: post.content,
      author: post.author,
      parentId: post.parentId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    };
  }

  async findByThread(threadId: string, userId?: string, userRole?: UserRole) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const posts = await this.prisma.post.findMany({
      where: {
        threadId,
        deletedAt: null
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                avatarBodyType: true,
                avatarSkinColor: true,
                avatarHairstyle: true,
                avatarAccessory: true
              }
            }
          }
        },
        votes: true,
        _count: {
          select: { replies: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    // Build nested structure
    const postMap = new Map();
    const rootPosts: any[] = [];

    // First pass: create all post objects
    posts.forEach((post) => {
      const userVote = userId
        ? post.votes.find((v) => v.userId === userId)?.value
        : undefined;

      const voteScore =
        userRole === UserRole.ADMIN
          ? post.votes.reduce((sum, v) => sum + v.value, 0)
          : undefined;

      const avatarConfig = post.author.profile?.avatarBodyType ? {
        bodyType: post.author.profile.avatarBodyType,
        skinColor: post.author.profile.avatarSkinColor,
        hairstyle: post.author.profile.avatarHairstyle,
        accessory: post.author.profile.avatarAccessory
      } : null;

      postMap.set(post.id, {
        id: post.id,
        content: post.content,
        author: {
          id: post.author.id,
          displayName: post.author.displayName,
          avatarConfig
        },
        parentId: post.parentId,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        replyCount: post._count.replies,
        userVote,
        ...(voteScore !== undefined && { voteScore }),
        replies: []
      });
    });

    // Second pass: build tree structure
    posts.forEach((post) => {
      const postObj = postMap.get(post.id);
      if (post.parentId && postMap.has(post.parentId)) {
        postMap.get(post.parentId).replies.push(postObj);
      } else {
        rootPosts.push(postObj);
      }
    });

    return rootPosts;
  }

  async findById(postId: string, userId?: string, userRole?: UserRole) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true
          }
        },
        votes: true,
        thread: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Post not found");
    }

    const userVote = userId
      ? post.votes.find((v) => v.userId === userId)?.value
      : undefined;

    const voteScore =
      userRole === UserRole.ADMIN
        ? post.votes.reduce((sum, v) => sum + v.value, 0)
        : undefined;

    return {
      id: post.id,
      content: post.content,
      author: post.author,
      thread: post.thread,
      parentId: post.parentId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      userVote,
      ...(voteScore !== undefined && { voteScore })
    };
  }

  async update(postId: string, dto: UpdatePostDto, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { thread: true }
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Post not found");
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException("You can only edit your own posts");
    }

    if (post.thread.isLocked) {
      throw new ForbiddenException("This thread is locked");
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { content: dto.content },
      include: {
        author: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    return {
      id: updated.id,
      content: updated.content,
      author: updated.author,
      parentId: updated.parentId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  }

  async delete(postId: string, userId: string, userRole: UserRole) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        thread: {
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
        }
      }
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Post not found");
    }

    const isAuthor = post.authorId === userId;
    const isModerator = post.thread.subcommunity.memberships[0]?.role === "moderator";
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAuthor && !isModerator && !isAdmin) {
      throw new ForbiddenException("You cannot delete this post");
    }

    // Soft delete
    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() }
    });

    return { message: "Post deleted successfully" };
  }

  async vote(postId: string, dto: VoteDto, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Post not found");
    }

    if (dto.value === 0) {
      throw new BadRequestException("Use DELETE to remove a vote");
    }

    // Upsert vote
    await this.prisma.vote.upsert({
      where: {
        postId_userId: {
          postId,
          userId
        }
      },
      create: {
        postId,
        userId,
        value: dto.value
      },
      update: {
        value: dto.value
      }
    });

    return { message: "Vote recorded" };
  }

  async removeVote(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Post not found");
    }

    const vote = await this.prisma.vote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (!vote) {
      throw new NotFoundException("Vote not found");
    }

    await this.prisma.vote.delete({
      where: { id: vote.id }
    });

    return { message: "Vote removed" };
  }

  // Admin-only: get vote breakdown for a post
  async getVotes(postId: string, userRole: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can view vote details");
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        votes: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    const upvotes = post.votes.filter((v) => v.value === 1);
    const downvotes = post.votes.filter((v) => v.value === -1);

    return {
      postId: post.id,
      totalScore: post.votes.reduce((sum, v) => sum + v.value, 0),
      upvoteCount: upvotes.length,
      downvoteCount: downvotes.length,
      votes: post.votes.map((v) => ({
        user: v.user,
        value: v.value,
        createdAt: v.createdAt
      }))
    };
  }
}
