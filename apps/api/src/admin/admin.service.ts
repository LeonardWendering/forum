import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  UserStatus,
  SubcommunityType,
  AvatarBodyType,
  AvatarSkinColor,
  AvatarHairstyle,
  AvatarAccessory
} from "@prisma/client";
import {
  CreateInviteCodeDto,
  UpdateUserStatusDto,
  UpdateSubcommunityVisibilityDto,
  CreateBotDto,
  CreateBotBatchDto,
  CreateAdminCommunityDto
} from "./dto";
import { generateToken } from "../common/utils/token";
import {
  generateUniqueCommunityName,
  generateUniqueBotName,
  nameToSlug
} from "../common/utils/community-name";
import * as argon2 from "argon2";

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
    const code = generateToken(8).toUpperCase();

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

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        isRestricted: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

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

  // ============================================
  // Bot Management
  // ============================================

  /**
   * Create a single bot account
   */
  async createBot(dto: CreateBotDto, adminId: string) {
    // Verify subcommunity exists
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { id: dto.subcommunityId }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Generate display name if not provided
    const displayName = dto.displayName || await generateUniqueBotName(
      async (name) => {
        const existing = await this.prisma.user.findFirst({
          where: { displayName: name }
        });
        return !!existing;
      }
    );

    // Generate a random password for the bot (not used for login, but required by schema)
    const randomPassword = generateToken(32);
    const passwordHash = await argon2.hash(randomPassword);

    // Generate unique email for bot (required by schema, but not used)
    const botEmail = `bot_${generateToken(12)}@bot.local`;

    // Determine avatar configuration
    const avatarConfig = this.resolveAvatarConfig(dto.avatarConfig);

    // Create bot user with profile and membership in a transaction
    const bot = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: botEmail,
          passwordHash,
          displayName,
          isBot: true,
          createdByAdminId: adminId,
          emailVerifiedAt: new Date(), // Auto-verified
          profile: {
            create: {
              avatarBodyType: avatarConfig.bodyType,
              avatarSkinColor: avatarConfig.skinColor,
              avatarHairstyle: avatarConfig.hairstyle,
              avatarAccessory: avatarConfig.accessory
            }
          }
        }
      });

      // Add bot to subcommunity
      await tx.membership.create({
        data: {
          userId: user.id,
          subcommunityId: dto.subcommunityId,
          role: "member"
        }
      });

      return user;
    });

    return {
      id: bot.id,
      displayName: bot.displayName,
      email: bot.email,
      isBot: bot.isBot,
      subcommunityId: dto.subcommunityId,
      avatar: {
        avatarBodyType: avatarConfig.bodyType,
        avatarSkinColor: avatarConfig.skinColor,
        avatarHairstyle: avatarConfig.hairstyle,
        avatarAccessory: avatarConfig.accessory
      }
    };
  }

  /**
   * Create multiple bot accounts at once
   */
  async createBotBatch(dto: CreateBotBatchDto, adminId: string) {
    // Verify subcommunity exists
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { id: dto.subcommunityId }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    const bots = [];

    for (let i = 0; i < dto.count; i++) {
      // Generate unique display name
      const displayName = await generateUniqueBotName(
        async (name) => {
          const existing = await this.prisma.user.findFirst({
            where: { displayName: name }
          });
          return !!existing;
        }
      );

      // Generate random password and email
      const randomPassword = generateToken(32);
      const passwordHash = await argon2.hash(randomPassword);
      const botEmail = `bot_${generateToken(12)}@bot.local`;

      // Determine avatar based on rules
      const avatarConfig = this.resolveAvatarFromRules(dto.avatarRules);

      // Create bot
      const bot = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: botEmail,
            passwordHash,
            displayName,
            isBot: true,
            createdByAdminId: adminId,
            emailVerifiedAt: new Date(),
            profile: {
              create: {
                avatarBodyType: avatarConfig.bodyType,
                avatarSkinColor: avatarConfig.skinColor,
                avatarHairstyle: avatarConfig.hairstyle,
                avatarAccessory: avatarConfig.accessory
              }
            }
          }
        });

        await tx.membership.create({
          data: {
            userId: user.id,
            subcommunityId: dto.subcommunityId,
            role: "member"
          }
        });

        return user;
      });

      bots.push({
        id: bot.id,
        displayName: bot.displayName,
        email: bot.email,
        avatar: {
          avatarBodyType: avatarConfig.bodyType,
          avatarSkinColor: avatarConfig.skinColor,
          avatarHairstyle: avatarConfig.hairstyle,
          avatarAccessory: avatarConfig.accessory
        }
      });
    }

    return {
      count: bots.length,
      subcommunityId: dto.subcommunityId,
      bots
    };
  }

  /**
   * Create a community with auto-generated name
   */
  async createCommunityWithRandomName(dto: CreateAdminCommunityDto, adminId: string) {
    // Generate unique community name
    const { name, slug } = await generateUniqueCommunityName(
      async (s) => {
        const existing = await this.prisma.subcommunity.findUnique({
          where: { slug: s }
        });
        return !!existing;
      }
    );

    // Hash password if type is PASSWORD_PROTECTED
    let hashedPassword = null;
    let plainPassword = null;
    if (dto.type === SubcommunityType.PASSWORD_PROTECTED) {
      plainPassword = generateToken(12);
      hashedPassword = await argon2.hash(plainPassword);
    }

    // Create subcommunity with invite code in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const subcommunity = await tx.subcommunity.create({
        data: {
          name,
          slug,
          description: dto.description || `Welcome to ${name}`,
          type: dto.type,
          password: hashedPassword,
          createdById: adminId
        }
      });

      // Create admin as moderator
      await tx.membership.create({
        data: {
          userId: adminId,
          subcommunityId: subcommunity.id,
          role: "moderator"
        }
      });

      // Create invite code for the community
      const inviteCode = await tx.inviteCode.create({
        data: {
          code: generateToken(8).toUpperCase(),
          subcommunityId: subcommunity.id,
          isRestricted: false,
          createdById: adminId
        }
      });

      return { subcommunity, inviteCode };
    });

    return {
      id: result.subcommunity.id,
      name: result.subcommunity.name,
      slug: result.subcommunity.slug,
      type: result.subcommunity.type,
      description: result.subcommunity.description,
      inviteCode: result.inviteCode.code,
      ...(plainPassword && { password: plainPassword })
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private resolveAvatarConfig(config?: {
    bodyType?: string;
    skinColor?: string;
    hairstyle?: string;
    accessory?: string;
  }) {
    const bodyTypes: AvatarBodyType[] = [
      AvatarBodyType.MALE,
      AvatarBodyType.FEMALE,
      AvatarBodyType.NEUTRAL
    ];
    const skinColors: AvatarSkinColor[] = [
      AvatarSkinColor.LIGHT,
      AvatarSkinColor.MEDIUM,
      AvatarSkinColor.DARK
    ];
    const hairstyles: AvatarHairstyle[] = [
      AvatarHairstyle.MALE_SHORT,
      AvatarHairstyle.MALE_SPIKY,
      AvatarHairstyle.NEUTRAL_BOB,
      AvatarHairstyle.NEUTRAL_CURLY,
      AvatarHairstyle.FEMALE_LONG,
      AvatarHairstyle.FEMALE_PONYTAIL
    ];
    const accessories: AvatarAccessory[] = [
      AvatarAccessory.NONE,
      AvatarAccessory.EARRING,
      AvatarAccessory.SUNGLASSES,
      AvatarAccessory.PARROT
    ];

    return {
      bodyType: config?.bodyType === "random" || !config?.bodyType
        ? bodyTypes[Math.floor(Math.random() * bodyTypes.length)]
        : config.bodyType as AvatarBodyType,
      skinColor: config?.skinColor === "random" || !config?.skinColor
        ? skinColors[Math.floor(Math.random() * skinColors.length)]
        : config.skinColor as AvatarSkinColor,
      hairstyle: config?.hairstyle === "random" || !config?.hairstyle
        ? hairstyles[Math.floor(Math.random() * hairstyles.length)]
        : config.hairstyle as AvatarHairstyle,
      accessory: config?.accessory === "random" || !config?.accessory
        ? (Math.random() > 0.7
            ? accessories[Math.floor(Math.random() * (accessories.length - 1)) + 1]
            : AvatarAccessory.NONE)
        : config.accessory as AvatarAccessory
    };
  }

  private resolveAvatarFromRules(rules?: {
    bodyTypeDistribution?: { MALE: number; FEMALE: number; NEUTRAL: number };
    accessoryChance?: number;
  }) {
    const skinColors: AvatarSkinColor[] = [
      AvatarSkinColor.LIGHT,
      AvatarSkinColor.MEDIUM,
      AvatarSkinColor.DARK
    ];
    const hairstyles: AvatarHairstyle[] = [
      AvatarHairstyle.MALE_SHORT,
      AvatarHairstyle.MALE_SPIKY,
      AvatarHairstyle.NEUTRAL_BOB,
      AvatarHairstyle.NEUTRAL_CURLY,
      AvatarHairstyle.FEMALE_LONG,
      AvatarHairstyle.FEMALE_PONYTAIL
    ];
    const accessoriesWithItems: AvatarAccessory[] = [
      AvatarAccessory.EARRING,
      AvatarAccessory.SUNGLASSES,
      AvatarAccessory.PARROT
    ];

    // Determine body type based on distribution
    let bodyType: AvatarBodyType;
    if (rules?.bodyTypeDistribution) {
      const { MALE, FEMALE, NEUTRAL } = rules.bodyTypeDistribution;
      const total = MALE + FEMALE + NEUTRAL;
      const rand = Math.random() * total;
      if (rand < MALE) {
        bodyType = AvatarBodyType.MALE;
      } else if (rand < MALE + FEMALE) {
        bodyType = AvatarBodyType.FEMALE;
      } else {
        bodyType = AvatarBodyType.NEUTRAL;
      }
    } else {
      const bodyTypes: AvatarBodyType[] = [
        AvatarBodyType.MALE,
        AvatarBodyType.FEMALE,
        AvatarBodyType.NEUTRAL
      ];
      bodyType = bodyTypes[Math.floor(Math.random() * bodyTypes.length)];
    }

    // Determine accessory based on chance
    const accessoryChance = rules?.accessoryChance ?? 30;
    const hasAccessory = Math.random() * 100 < accessoryChance;
    const accessory = hasAccessory
      ? accessoriesWithItems[Math.floor(Math.random() * accessoriesWithItems.length)]
      : AvatarAccessory.NONE;

    return {
      bodyType,
      skinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
      hairstyle: hairstyles[Math.floor(Math.random() * hairstyles.length)],
      accessory
    };
  }
}
