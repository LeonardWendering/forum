// User types
export type UserRole = "MEMBER" | "MODERATOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRestricted: boolean;
  restrictedToSubcommunityId: string | null;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface AuthPayload {
  user: User;
  tokens: AuthTokens;
}

// API response types
export interface ApiError {
  message: string;
  error?: string;
  statusCode: number;
}

export interface MessageResponse {
  message: string;
}

// Auth request types
export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
  inviteCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ValidateInviteCodeResponse {
  valid: boolean;
  isRestricted: boolean;
  subcommunity: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
}
