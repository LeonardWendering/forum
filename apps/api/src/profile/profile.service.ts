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
}
