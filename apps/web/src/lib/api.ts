import type {
  AuthPayload,
  ApiError,
  MessageResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  ResendVerificationRequest,
  ValidateInviteCodeResponse
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Token storage keys
const ACCESS_TOKEN_KEY = "forum_access_token";
const REFRESH_TOKEN_KEY = "forum_refresh_token";
const TOKEN_EXPIRY_KEY = "forum_token_expiry";

// Token management
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getTokenExpiry: (): number | null => {
    if (typeof window === "undefined") return null;
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  setTokens: (accessToken: string, refreshToken: string, expiresIn: number): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    // Store expiry as timestamp (current time + expiresIn seconds - 30s buffer)
    const expiryTime = Date.now() + (expiresIn - 30) * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  },

  clearTokens: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  isTokenExpired: (): boolean => {
    const expiry = tokenStorage.getTokenExpiry();
    if (!expiry) return true;
    return Date.now() >= expiry;
  }
};

// Request queue for handling concurrent requests during token refresh
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      tokenStorage.clearTokens();
      return false;
    }

    const data: AuthPayload = await response.json();
    tokenStorage.setTokens(
      data.tokens.accessToken,
      data.tokens.refreshToken,
      data.tokens.accessTokenExpiresIn
    );
    return true;
  } catch {
    tokenStorage.clearTokens();
    return false;
  }
}

async function ensureValidToken(): Promise<string | null> {
  const accessToken = tokenStorage.getAccessToken();

  if (!accessToken) return null;

  if (!tokenStorage.isTokenExpired()) {
    return accessToken;
  }

  // Token is expired, need to refresh
  if (isRefreshing && refreshPromise) {
    // Wait for the ongoing refresh
    const success = await refreshPromise;
    return success ? tokenStorage.getAccessToken() : null;
  }

  isRefreshing = true;
  refreshPromise = refreshAccessToken();

  try {
    const success = await refreshPromise;
    return success ? tokenStorage.getAccessToken() : null;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

// Generic fetch wrapper
interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requireAuth?: boolean;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public error?: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { body, requireAuth = false, ...init } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init.headers
  };

  if (requireAuth) {
    const token = await ensureValidToken();
    if (!token) {
      throw new ApiClientError("Not authenticated", 401);
    }
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  } else {
    // Even for non-required auth, include token if available (for optional auth endpoints)
    const token = tokenStorage.getAccessToken();
    if (token && !tokenStorage.isTokenExpired()) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  // Add timeout to prevent hanging requests when API is unreachable
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiClientError("Request timed out - is the API server running?", 0);
    }
    throw new ApiClientError("Network error - is the API server running?", 0);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      message: "An unexpected error occurred",
      statusCode: response.status
    }));
    throw new ApiClientError(errorData.message, response.status, errorData.error);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text) as T;
}

// Auth API
export const authApi = {
  register: (data: RegisterRequest): Promise<MessageResponse> =>
    apiFetch("/auth/register", { method: "POST", body: data }),

  login: async (data: LoginRequest): Promise<AuthPayload> => {
    const result = await apiFetch<AuthPayload>("/auth/login", {
      method: "POST",
      body: data
    });
    tokenStorage.setTokens(
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.accessTokenExpiresIn
    );
    return result;
  },

  verifyEmail: (data: VerifyEmailRequest): Promise<MessageResponse> =>
    apiFetch("/auth/verify-email", { method: "POST", body: data }),

  resendVerification: (data: ResendVerificationRequest): Promise<MessageResponse> =>
    apiFetch("/auth/verification/resend", { method: "POST", body: data }),

  requestPasswordReset: (data: RequestPasswordResetRequest): Promise<MessageResponse> =>
    apiFetch("/auth/password/request-reset", { method: "POST", body: data }),

  resetPassword: (data: ResetPasswordRequest): Promise<MessageResponse> =>
    apiFetch("/auth/password/reset", { method: "POST", body: data }),

  validateInviteCode: (code: string): Promise<ValidateInviteCodeResponse> =>
    apiFetch("/auth/validate-invite-code", { method: "POST", body: { code } }),

  logout: async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: { refreshToken }
        });
      } catch {
        // Ignore logout errors
      }
    }
    tokenStorage.clearTokens();
  },

  refresh: async (): Promise<AuthPayload | null> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const result = await apiFetch<AuthPayload>("/auth/refresh", {
        method: "POST",
        body: { refreshToken }
      });
      tokenStorage.setTokens(
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.accessTokenExpiresIn
      );
      return result;
    } catch {
      tokenStorage.clearTokens();
      return null;
    }
  }
};

// Generic API methods for authenticated requests
export const api = {
  get: <T>(endpoint: string, requireAuth = false): Promise<T> =>
    apiFetch(endpoint, { method: "GET", requireAuth }),

  post: <T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> =>
    apiFetch(endpoint, { method: "POST", body, requireAuth }),

  patch: <T>(endpoint: string, body?: unknown, requireAuth = true): Promise<T> =>
    apiFetch(endpoint, { method: "PATCH", body, requireAuth }),

  delete: <T>(endpoint: string, requireAuth = true): Promise<T> =>
    apiFetch(endpoint, { method: "DELETE", requireAuth })
};
