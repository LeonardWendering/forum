import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UserStatus, SubcommunityType } from "@prisma/client";
import { CreateInviteCodeDto, UpdateUserStatusDto, UpdateSubcommunityVisibilityDto } from "./dto";
import { generateSecureToken } from "../common/utils/token";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Invite Code Management
  // ============================================

  async createInviteCode(dto: CreateInviteCodeDto, adminId: string) {
    // Verify subcommunity exists
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { id: dto.subcommunityId }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Generate unique code
    const code = generateSecureToken(8).toUpperCase();

    const inviteCode = await this.prisma.inviteCode.create({
      data: {
        code,
        subcommunityId: dto.subcommunityId,
        isRestricted: dto.isRestricted ?? false,
        usesRemaining: dto.usesRemaining ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: adminId
      },
      include: {
        subcommunity: {
          select: { id: true, name: true, slug: true }
        },
        createdBy: {
          select: { id: true, displayName: true }
        }
      }
    });

    return inviteCode;
  }

  async listInviteCodes() {
    return this.prisma.inviteCode.findMany({
      include: {
        subcommunity: {
          select: { id: true, name: true, slug: true }
        },
        createdBy: {
          select: { id: true, displayName: true }
        },
        _count: {
          select: { usedBy: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async deleteInviteCode(inviteCodeId: string) {
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: { id: inviteCodeId }
    });

    if (!inviteCode) {
      throw new NotFoundException("Invite code not found");
    }

    await this.prisma.inviteCode.delete({
      where: { id: inviteCodeId }
    });

    return { message: "Invite code deleted successfully" };
  }

  async validateInviteCode(code: string) {
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: { code },
      include: {
        subcommunity: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!inviteCode) {
      throw new BadRequestException("Invalid invite code");
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw new BadRequestException("Invite code has expired");
    }

    if (inviteCode.usesRemaining !== null && inviteCode.usesRemaining <= 0) {
      throw new BadRequestException("Invite code has been fully used");
    }

    return inviteCode;
  }

  // ============================================
  // User Management
  // ============================================

  async suspendUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === "ADMIN") {
      throw new ForbiddenException("Cannot suspend an admin user");
    }

    await this.prisma.$transaction([
      // Update user status
      this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.SUSPENDED }
      }),
      // Revoke all sessions
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return { message: "User suspended successfully" };
  }

  async unsuspendUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException("User is not suspended");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE }
    });

    return { message: "User unsuspended successfully" };
  }

  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === "ADMIN") {
      throw new ForbiddenException("Cannot delete an admin user");
    }

    // Anonymize user data (same pattern as profile delete)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          displayName: "(deleted user)",
          email: `deleted_${userId}@deleted.local`,
          passwordHash: "DELETED",
          status: UserStatus.DISABLED
        }
      }),
      this.prisma.profile.update({
        where: { userId },
        data: {
          bio: null,
          avatarUrl: null,
          avatarBodyType: null,
          avatarSkinColor: null,
          avatarHairstyle: null,
          avatarAccessory: null
        }
      }),
      this.prisma.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() }
      })
    ]);

    return { message: "User deleted successfully" };
  }

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          isRestricted: true,
          createdAt: true,
          emailVerifiedAt: true,
          profile: {
            select: {
              avatarBodyType: true,
              avatarSkinColor: true,
              avatarHairstyle: true,
              avatarAccessory: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.user.count()
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // ============================================
  // Subcommunity Moderation
  // ============================================

  async muteSubcommunity(subcommunityId: string, adminId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { id: subcommunityId }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    await this.prisma.subcommunity.update({
      where: { id: subcommunityId },
      data: {
        isMuted: true,
        mutedAt: new Date(),
        mutedById: adminId
      }
    });

    return { message: "Subcommunity muted successfully" };
  }

  async unmuteSubcommunity(subcommunityId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { id: subcommunityId }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    await this.prisma.subcommunity.update({
      where: { id: subcommunityId },
      data: {
        isMuted: false,
        mutedAt: null,
        mutedById: null
      }
    });

    return { message: "Subcommunity unmuted successfully" };
  }

  async updateSubcommunityVisibility(
    subcommunityId: string,
    dto: UpdateSubcommunityVisibilityDto
  ) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { id: subcommunityId }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    const updated = await this.prisma.subcommunity.update({
      where: { id: subcommunityId },
      data: { type: dto.type }
    });

    return updated;
  }

  async deleteSubcommunity(subcommunityId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { id: subcommunityId }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    await this.prisma.subcommunity.delete({
      where: { id: subcommunityId }
    });

    return { message: "Subcommunity deleted successfully" };
  }

  // ============================================
  // Thread Moderation
  // ============================================

  async muteThread(threadId: string, adminId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    await this.prisma.thread.update({
      where: { id: threadId },
      data: {
        isMuted: true,
        mutedAt: new Date(),
        mutedById: adminId
      }
    });

    return { message: "Thread muted successfully" };
  }

  async unmuteThread(threadId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    await this.prisma.thread.update({
      where: { id: threadId },
      data: {
        isMuted: false,
        mutedAt: null,
        mutedById: null
      }
    });

    return { message: "Thread unmuted successfully" };
  }

  // ============================================
  // Post Moderation
  // ============================================

  async mutePost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        isMuted: true,
        mutedAt: new Date(),
        mutedById: adminId
      }
    });

    return { message: "Post muted successfully" };
  }

  async unmutePost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        isMuted: false,
        mutedAt: null,
        mutedById: null
      }
    });

    return { message: "Post unmuted successfully" };
  }
}
