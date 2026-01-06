import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateSubcommunityDto, UpdateSubcommunityDto, JoinSubcommunityDto } from "./dto";
import { SubcommunityType, UserRole } from "@prisma/client";
import * as argon2 from "argon2";

@Injectable()
export class SubcommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubcommunityDto, userId: string) {
    // Validate password requirement for PASSWORD_PROTECTED type
    if (dto.type === SubcommunityType.PASSWORD_PROTECTED && !dto.password) {
      throw new BadRequestException("Password is required for password-protected subcommunities");
    }

    // Check if slug already exists
    const existing = await this.prisma.subcommunity.findUnique({
      where: { slug: dto.slug }
    });

    if (existing) {
      throw new ConflictException("A subcommunity with this slug already exists");
    }

    // Hash password if provided
    const hashedPassword = dto.password ? await argon2.hash(dto.password) : null;

    // Create subcommunity and add creator as member
    const subcommunity = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subcommunity.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          type: dto.type || SubcommunityType.PUBLIC,
          password: hashedPassword,
          createdById: userId
        }
      });

      // Auto-join creator as moderator
      await tx.membership.create({
        data: {
          userId,
          subcommunityId: sub.id,
          role: "moderator"
        }
      });

      return sub;
    });

    return this.findBySlug(subcommunity.slug, userId);
  }

  async findAll(userId?: string, userRole?: UserRole, isRestricted?: boolean, restrictedToSubcommunityId?: string | null) {
    // If user is restricted, only show their restricted subcommunity
    if (isRestricted && restrictedToSubcommunityId) {
      const subcommunity = await this.prisma.subcommunity.findUnique({
        where: { id: restrictedToSubcommunityId },
        include: {
          _count: {
            select: {
              memberships: true,
              threads: true
            }
          },
          createdBy: {
            select: {
              id: true,
              displayName: true
            }
          },
          memberships: userId
            ? {
                where: { userId },
                select: { role: true, joinedAt: true }
              }
            : false
        }
      });

      if (!subcommunity) {
        return [];
      }

      const membershipInfo = userId && subcommunity.memberships?.[0];

      return [{
        id: subcommunity.id,
        name: subcommunity.name,
        slug: subcommunity.slug,
        description: subcommunity.description,
        type: subcommunity.type,
        createdBy: subcommunity.createdBy,
        createdAt: subcommunity.createdAt,
        memberCount: subcommunity._count.memberships,
        threadCount: subcommunity._count.threads,
        isMember: !!membershipInfo,
        membership: membershipInfo || null
      }];
    }

    const subcommunities = await this.prisma.subcommunity.findMany({
      where: {
        // Filter out muted subcommunities for non-admins
        ...(userRole !== UserRole.ADMIN && { isMuted: false }),
        OR: [
          { type: SubcommunityType.PUBLIC },
          { type: SubcommunityType.PASSWORD_PROTECTED }, // Show password-protected to all
          ...(userId
            ? [
                {
                  memberships: {
                    some: { userId }
                  }
                }
              ]
            : [])
        ]
      },
      include: {
        _count: {
          select: {
            memberships: true,
            threads: true
          }
        },
        createdBy: {
          select: {
            id: true,
            displayName: true
          }
        },
        memberships: userId
          ? {
              where: { userId },
              select: { role: true, joinedAt: true }
            }
          : false
      },
      orderBy: { createdAt: "desc" }
    });

    return subcommunities.map((sub) => {
      const membershipInfo = userId && sub.memberships?.[0];
      const isMember = !!membershipInfo;

      return {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        type: sub.type,
        createdBy: sub.createdBy,
        createdAt: sub.createdAt,
        memberCount: sub._count.memberships,
        // Hide thread count for non-members of password-protected subcommunities
        threadCount: sub.type === SubcommunityType.PASSWORD_PROTECTED && !isMember
          ? undefined
          : sub._count.threads,
        isMember,
        membership: membershipInfo || null
      };
    });
  }

  async findBySlug(slug: string, userId?: string, userRole?: UserRole, isRestricted?: boolean, restrictedToSubcommunityId?: string | null) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            memberships: true,
            threads: true
          }
        },
        createdBy: {
          select: {
            id: true,
            displayName: true
          }
        },
        memberships: userId
          ? {
              where: { userId },
              select: { role: true, joinedAt: true }
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

    const membershipInfo = userId && subcommunity.memberships?.[0];
    const isMember = !!membershipInfo;

    // Check access for non-public subcommunities
    if (subcommunity.type === SubcommunityType.INVITE_ONLY && !isMember) {
      throw new ForbiddenException("This subcommunity is invite-only");
    }

    // For password-protected subcommunities, non-members can see basic info but not threads
    const requiresPassword = subcommunity.type === SubcommunityType.PASSWORD_PROTECTED && !isMember;

    return {
      id: subcommunity.id,
      name: subcommunity.name,
      slug: subcommunity.slug,
      description: subcommunity.description,
      type: subcommunity.type,
      createdBy: subcommunity.createdBy,
      createdAt: subcommunity.createdAt,
      memberCount: subcommunity._count.memberships,
      // Hide thread count for non-members of password-protected subcommunities
      threadCount: requiresPassword ? undefined : subcommunity._count.threads,
      isMember,
      membership: membershipInfo || null,
      requiresPassword
    };
  }

  async update(slug: string, dto: UpdateSubcommunityDto, userId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug },
      include: {
        memberships: {
          where: { userId },
          select: { role: true }
        }
      }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Check if user is moderator or creator
    const membership = subcommunity.memberships[0];
    const isCreator = subcommunity.createdById === userId;
    const isModerator = membership?.role === "moderator";

    if (!isCreator && !isModerator) {
      throw new ForbiddenException("Only moderators can update subcommunity settings");
    }

    // Hash new password if provided
    const hashedPassword = dto.password ? await argon2.hash(dto.password) : undefined;

    await this.prisma.subcommunity.update({
      where: { slug },
      data: {
        description: dto.description,
        type: dto.type,
        ...(hashedPassword && { password: hashedPassword })
      }
    });

    return this.findBySlug(slug, userId);
  }

  async join(slug: string, dto: JoinSubcommunityDto, userId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Check if already a member
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_subcommunityId: {
          userId,
          subcommunityId: subcommunity.id
        }
      }
    });

    if (existingMembership) {
      throw new ConflictException("Already a member of this subcommunity");
    }

    // Handle different subcommunity types
    if (subcommunity.type === SubcommunityType.INVITE_ONLY) {
      throw new ForbiddenException("This subcommunity is invite-only");
    }

    if (subcommunity.type === SubcommunityType.PASSWORD_PROTECTED) {
      if (!dto.password) {
        throw new BadRequestException("Password is required to join this subcommunity");
      }

      const isValidPassword = await argon2.verify(subcommunity.password!, dto.password);
      if (!isValidPassword) {
        throw new ForbiddenException("Invalid password");
      }
    }

    await this.prisma.membership.create({
      data: {
        userId,
        subcommunityId: subcommunity.id,
        role: "member"
      }
    });

    return { message: "Successfully joined subcommunity" };
  }

  async leave(slug: string, userId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    // Check if creator is trying to leave
    if (subcommunity.createdById === userId) {
      throw new ForbiddenException("Creator cannot leave the subcommunity");
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_subcommunityId: {
          userId,
          subcommunityId: subcommunity.id
        }
      }
    });

    if (!membership) {
      throw new NotFoundException("Not a member of this subcommunity");
    }

    await this.prisma.membership.delete({
      where: { id: membership.id }
    });

    return { message: "Successfully left subcommunity" };
  }

  async getMembers(slug: string, userId: string) {
    const subcommunity = await this.prisma.subcommunity.findUnique({
      where: { slug },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                role: true
              }
            }
          },
          orderBy: { joinedAt: "asc" }
        }
      }
    });

    if (!subcommunity) {
      throw new NotFoundException("Subcommunity not found");
    }

    return subcommunity.memberships.map((m) => ({
      user: m.user,
      role: m.role,
      joinedAt: m.joinedAt
    }));
  }
}
