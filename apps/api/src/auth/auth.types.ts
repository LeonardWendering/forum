import type { User, UserRole, UserStatus } from "@prisma/client";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export type PublicUser = Pick<
  User,
  "id" | "email" | "displayName" | "role" | "status" | "emailVerifiedAt" | "createdAt" | "updatedAt"
>;

export interface AuthPayload {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}
