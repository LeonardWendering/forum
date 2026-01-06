import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma, User, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../database/prisma.service";
import { durationToMs } from "../common/utils/duration";
import { generateToken, generateVerificationCode } from "../common/utils/token";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { AuthPayload, PublicUser, RequestMetadata } from "./auth.types";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly skipEmailVerification: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService
  ) {
    this.accessSecret = this.configService.getOrThrow<string>("JWT_ACCESS_TOKEN_SECRET");
    this.refreshSecret = this.configService.getOrThrow<string>("JWT_REFRESH_TOKEN_SECRET");
    this.accessTtl = this.configService.getOrThrow<string>("JWT_ACCESS_TOKEN_TTL");
    this.refreshTtl = this.configService.getOrThrow<string>("JWT_REFRESH_TOKEN_TTL");
    const skipEnvValue = this.configService.get<string>("SKIP_EMAIL_VERIFICATION");
    this.skipEmailVerification = skipEnvValue === "true";
    this.logger.log(`SKIP_EMAIL_VERIFICATION env value: "${skipEnvValue}", parsed as: ${this.skipEmailVerification}`);

    this.accessTtlMs = durationToMs(this.accessTtl, "15m");
    this.refreshTtlMs = durationToMs(this.refreshTtl, "30d");

    this.accessTtlSeconds = Math.floor(this.accessTtlMs / 1000);
    this.refreshTtlSeconds = Math.floor(this.refreshTtlMs / 1000);

    if (this.skipEmailVerification) {
      this.logger.warn("Email verification is DISABLED - users will be auto-verified on registration");
    }
  }

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const displayName = dto.displayName.trim();
    const passwordHash = await argon2.hash(dto.password);

    // Validate invite code if provided
    let inviteCode: {
      id: string;
      subcommunityId: string;
      isRestricted: boolean;
      usesRemaining: number | null;
    } | null = null;

    if (dto.inviteCode) {
      const foundCode = await this.prisma.inviteCode.findUnique({
        where: { code: dto.inviteCode },
        select: {
          id: true,
          subcommunityId: true,
          isRestricted: true,
          usesRemaining: true,
          expiresAt: true
        }
      });

      if (!foundCode) {
        throw new BadRequestException("Invalid invite code");
      }

      if (foundCode.expiresAt && foundCode.expiresAt < new Date()) {
        throw new BadRequestException("Invite code has expired");
      }

      if (foundCode.usesRemaining !== null && foundCode.usesRemaining <= 0) {
        throw new BadRequestException("Invite code has been fully used");
      }

      inviteCode = foundCode;
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    // If user exists and is verified, reject registration
    if (existingUser && existingUser.emailVerifiedAt) {
      throw new ConflictException("An account with this email already exists.");
    }

    // If user exists but is NOT verified, update their info and resend verification
    if (existingUser && !existingUser.emailVerifiedAt) {
      if (this.skipEmailVerification) {
        // Auto-verify the user
        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash,
              displayName,
              emailVerifiedAt: new Date(),
              isRestricted: inviteCode?.isRestricted ?? false,
              restrictedToSubcommunityId: inviteCode?.isRestricted ? inviteCode.subcommunityId : null,
              registeredWithInviteId: inviteCode?.id ?? null
            }
          });

          // Auto-join to subcommunity if invite code provided
          if (inviteCode) {
            // Check if already a member
            const existingMembership = await tx.membership.findUnique({
              where: {
                userId_subcommunityId: {
                  userId: existingUser.id,
                  subcommunityId: inviteCode.subcommunityId
                }
              }
            });

            if (!existingMembership) {
              await tx.membership.create({
                data: {
                  userId: existingUser.id,
                  subcommunityId: inviteCode.subcommunityId,
                  role: "member"
                }
              });
            }

            // Decrement uses if limited
            if (inviteCode.usesRemaining !== null) {
              await tx.inviteCode.update({
                where: { id: inviteCode.id },
                data: { usesRemaining: { decrement: 1 } }
              });
            }
          }
        });

        return {
          message: "Registration successful. You can now sign in."
        };
      }

      const { user, token } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Update the existing unverified user
        const updatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            displayName,
            isRestricted: inviteCode?.isRestricted ?? false,
            restrictedToSubcommunityId: inviteCode?.isRestricted ? inviteCode.subcommunityId : null,
            registeredWithInviteId: inviteCode?.id ?? null
          }
        });

        // Auto-join to subcommunity if invite code provided
        if (inviteCode) {
          const existingMembership = await tx.membership.findUnique({
            where: {
              userId_subcommunityId: {
                userId: existingUser.id,
                subcommunityId: inviteCode.subcommunityId
              }
            }
          });

          if (!existingMembership) {
            await tx.membership.create({
              data: {
                userId: existingUser.id,
                subcommunityId: inviteCode.subcommunityId,
                role: "member"
              }
            });
          }

          if (inviteCode.usesRemaining !== null) {
            await tx.inviteCode.update({
              where: { id: inviteCode.id },
              data: { usesRemaining: { decrement: 1 } }
            });
          }
        }

        // Delete old verification tokens
        await tx.emailVerificationToken.deleteMany({
          where: { userId: existingUser.id }
        });

        const verificationToken = await this.issueEmailVerificationToken(tx, updatedUser.id);

        return { user: updatedUser, token: verificationToken };
      });

      await this.mailService.sendVerificationEmail(user.email, token.token);

      return {
        message: "Registration successful. Check your email for a verification code."
      };
    }

    // Create new user
    if (this.skipEmailVerification) {
      // Auto-verify the user on creation
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            displayName,
            emailVerifiedAt: new Date(),
            isRestricted: inviteCode?.isRestricted ?? false,
            restrictedToSubcommunityId: inviteCode?.isRestricted ? inviteCode.subcommunityId : null,
            registeredWithInviteId: inviteCode?.id ?? null,
            profile: {
              create: {}
            }
          }
        });

        // Auto-join to subcommunity if invite code provided
        if (inviteCode) {
          await tx.membership.create({
            data: {
              userId: createdUser.id,
              subcommunityId: inviteCode.subcommunityId,
              role: "member"
            }
          });

          if (inviteCode.usesRemaining !== null) {
            await tx.inviteCode.update({
              where: { id: inviteCode.id },
              data: { usesRemaining: { decrement: 1 } }
            });
          }
        }
      });

      return {
        message: "Registration successful. You can now sign in."
      };
    }

    const { user, token } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          isRestricted: inviteCode?.isRestricted ?? false,
          restrictedToSubcommunityId: inviteCode?.isRestricted ? inviteCode.subcommunityId : null,
          registeredWithInviteId: inviteCode?.id ?? null,
          profile: {
            create: {}
          }
        }
      });

      // Auto-join to subcommunity if invite code provided
      if (inviteCode) {
        await tx.membership.create({
          data: {
            userId: createdUser.id,
            subcommunityId: inviteCode.subcommunityId,
            role: "member"
          }
        });

        if (inviteCode.usesRemaining !== null) {
          await tx.inviteCode.update({
            where: { id: inviteCode.id },
            data: { usesRemaining: { decrement: 1 } }
          });
        }
      }

      const verificationToken = await this.issueEmailVerificationToken(tx, createdUser.id);

      return { user: createdUser, token: verificationToken };
    });

    await this.mailService.sendVerificationEmail(user.email, token.token);

    return {
      message: "Registration successful. Check your email for a verification code."
    };
  }

  async validateInviteCode(code: string) {
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: { code },
      include: {
        subcommunity: {
          select: { id: true, name: true, slug: true, description: true }
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

    return {
      valid: true,
      isRestricted: inviteCode.isRestricted,
      subcommunity: inviteCode.subcommunity
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return { message: "If an account exists for that email, instructions were sent." };
    }

    const token = await this.prisma.$transaction((tx: Prisma.TransactionClient) =>
      this.issueEmailVerificationToken(tx, user.id)
    );
    await this.mailService.sendVerificationEmail(user.email, token.token);

    return { message: "Verification email sent." };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new BadRequestException("Invalid verification request.");
    }

    const tokenRecord = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        token: dto.code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!tokenRecord) {
      throw new BadRequestException("Verification code is invalid or has expired.");
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date()
        }
      });

      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() }
      });
    });

    return { message: "Email verified. You can now sign in." };
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthPayload> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException("Your account is not active.");
    }

    if (!user.emailVerifiedAt) {
      await this.resendVerification(user.email);
      throw new ForbiddenException("Please verify your email. We've sent a fresh code.");
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    return this.generateAuthPayload(user, metadata);
  }

  async refreshTokens(dto: RefreshTokenDto, metadata: RequestMetadata): Promise<AuthPayload> {
    const { refreshToken } = dto;
    let payload: { sub: string; sid?: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (!payload?.sid) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid }
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh session is no longer valid.");
    }

    const tokenMatches = await argon2.verify(session.tokenHash, refreshToken).catch(() => false);
    if (!tokenMatches) {
      throw new UnauthorizedException("Refresh session mismatch.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException("Your account is not active.");
    }

    return this.generateAuthPayload(user, metadata, session.id);
  }

  async logout(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    let payload: { sid?: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (!payload.sid) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    await this.prisma.session.updateMany({
      where: { id: payload.sid },
      data: { revokedAt: new Date() }
    });

    return { message: "Logged out." };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Avoid leaking which emails exist.
      return { message: "If an account exists for that email, instructions were sent." };
    }

    const token = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });

      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          token: generateToken(48),
          expiresAt: new Date(Date.now() + 1000 * 60 * 30) // 30 minutes
        }
      });
    });

    await this.mailService.sendPasswordResetEmail(user.email, token.token);

    return { message: "If an account exists for that email, instructions were sent." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true }
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException("Reset token is invalid or has expired.");
    }

    if (tokenRecord.user.email !== email) {
      throw new BadRequestException("Reset token is invalid for this user.");
    }

    const newHash = await argon2.hash(dto.password);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash: newHash
        }
      });

      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: new Date()
        }
      });

      await tx.session.deleteMany({
        where: { userId: tokenRecord.userId }
      });
    });

    return { message: "Password updated. You can now sign in with the new password." };
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isRestricted: user.isRestricted,
      restrictedToSubcommunityId: user.restrictedToSubcommunityId
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async generateAuthPayload(user: User, metadata: RequestMetadata, existingSessionId?: string): Promise<AuthPayload> {
    const sessionId = existingSessionId ?? generateToken(24);

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role
      },
      {
        secret: this.accessSecret,
        expiresIn: this.accessTtl
      }
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        sid: sessionId
      },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl
      }
    );

    const tokenHash = await argon2.hash(refreshToken);

    if (existingSessionId) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          tokenHash,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          expiresAt: new Date(Date.now() + this.refreshTtlMs),
          revokedAt: null
        }
      });
    } else {
      await this.prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          tokenHash,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          expiresAt: new Date(Date.now() + this.refreshTtlMs)
        }
      });
    }

    return {
      user: this.toPublicUser(user),
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: this.accessTtlSeconds,
        refreshTokenExpiresIn: this.refreshTtlSeconds
      }
    };
  }

  private async issueEmailVerificationToken(tx: Prisma.TransactionClient, userId: string) {
    await tx.emailVerificationToken.deleteMany({
      where: { userId }
    });

    return tx.emailVerificationToken.create({
      data: {
        userId,
        token: generateVerificationCode(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 10) // 10 minutes
      }
    });
  }
}
