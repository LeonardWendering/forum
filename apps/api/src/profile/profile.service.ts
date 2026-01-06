import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UpdateAvatarDto } from "./dto/update-avatar.dto";
import { AvatarAccessory } from "@prisma/client";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            role: true,
            createdAt: true
          }
        }
      }
    });

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    return {
      userId: profile.userId,
      displayName: profile.user.displayName,
      role: profile.user.role,
      bio: profile.bio,
      avatarConfig: profile.avatarBodyType ? {
        bodyType: profile.avatarBodyType,
        skinColor: profile.avatarSkinColor,
        hairstyle: profile.avatarHairstyle,
        accessory: profile.avatarAccessory
      } : null,
      createdAt: profile.user.createdAt
    };
  }

  async getPublicProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            createdAt: true
          }
        }
      }
    });

    if (!profile) {
      throw new NotFoundException("User not found");
    }

    return {
      id: profile.user.id,
      displayName: profile.user.displayName,
      bio: profile.bio,
      avatarConfig: profile.avatarBodyType ? {
        bodyType: profile.avatarBodyType,
        skinColor: profile.avatarSkinColor,
        hairstyle: profile.avatarHairstyle,
        accessory: profile.avatarAccessory
      } : null,
      memberSince: profile.user.createdAt
    };
  }

  async updateAvatar(userId: string, dto: UpdateAvatarDto) {
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        avatarBodyType: dto.bodyType,
        avatarSkinColor: dto.skinColor,
        avatarHairstyle: dto.hairstyle,
        avatarAccessory: dto.accessory || AvatarAccessory.NONE
      },
      create: {
        userId,
        avatarBodyType: dto.bodyType,
        avatarSkinColor: dto.skinColor,
        avatarHairstyle: dto.hairstyle,
        avatarAccessory: dto.accessory || AvatarAccessory.NONE
      }
    });

    return {
      avatarConfig: {
        bodyType: profile.avatarBodyType,
        skinColor: profile.avatarSkinColor,
        hairstyle: profile.avatarHairstyle,
        accessory: profile.avatarAccessory
      }
    };
  }

  async hasAvatar(userId: string): Promise<boolean> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { avatarBodyType: true }
    });
    return profile?.avatarBodyType !== null;
  }

  async getUserMemberships(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        subcommunity: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            type: true,
            createdAt: true,
            _count: {
              select: {
                memberships: true,
                threads: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });

    return memberships.map((m) => ({
      id: m.subcommunity.id,
      name: m.subcommunity.name,
      slug: m.subcommunity.slug,
      description: m.subcommunity.description,
      type: m.subcommunity.type,
      createdAt: m.subcommunity.createdAt,
      memberCount: m.subcommunity._count.memberships,
      threadCount: m.subcommunity._count.threads,
      role: m.role,
      joinedAt: m.joinedAt
    }));
  }

  async getUserPosts(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          authorId: userId,
          deletedAt: null
        },
        include: {
          thread: {
            select: {
              id: true,
              title: true,
              subcommunity: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          },
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
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      this.prisma.post.count({
        where: {
          authorId: userId,
          deletedAt: null
        }
      })
    ]);

    return {
      posts: posts.map((post) => ({
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        thread: {
          id: post.thread.id,
          title: post.thread.title,
          subcommunity: post.thread.subcommunity
        },
        author: {
          id: post.author.id,
          displayName: post.author.displayName,
          avatarConfig: post.author.profile?.avatarBodyType ? {
            bodyType: post.author.profile.avatarBodyType,
            skinColor: post.author.profile.avatarSkinColor,
            hairstyle: post.author.profile.avatarHairstyle,
            accessory: post.author.profile.avatarAccessory
          } : null
        }
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async deleteAccount(userId: string) {
    // Update user's display name to "(deleted user)" and clear sensitive data
    await this.prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: userId },
        data: {
          displayName: "(deleted user)",
          email: `deleted_${userId}@deleted.local`,
          passwordHash: "DELETED",
          status: "DISABLED"
        }
      });

      // Clear profile
      await tx.profile.update({
        where: { userId },
        data: {
          bio: null,
          avatarBodyType: null,
          avatarSkinColor: null,
          avatarHairstyle: null,
          avatarAccessory: null
        }
      });

      // Revoke all sessions
      await tx.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() }
      });
    });

    return { message: "Account deleted successfully" };
  }
}
