import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  MAILHOG_HOST: z.string().default("localhost"),
  MAILHOG_PORT: z.coerce.number().default(1025),
  MAIL_FROM_ADDRESS: z.string().email().default("forum@example.com"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_TTL: z.string().default("15m"),
  JWT_REFRESH_TOKEN_SECRET: z.string().min(32),
  JWT_REFRESH_TOKEN_TTL: z.string().default("30d")
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): EnvConfig => {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const message = Object.entries(flattened.fieldErrors)
      .map(([field, errors]) => `${field}: ${errors?.join(", ") ?? "invalid"}`)
      .join("; ");

    throw new Error(`Invalid environment variables - ${message}`);
  }

  return parsed.data;
};
