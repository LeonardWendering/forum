# Community Forum Monorepo

This repository hosts the privacy-first discussion forum described in `description.md`. It uses a pnpm workspace to keep the web client (Next.js), API (NestJS), and shared packages aligned.

## Structure

- `apps/web`: Next.js frontend.
- `apps/api`: NestJS backend.
- `packages/shared`: Shared TypeScript utilities and schemas.
- `docker-compose.yml`: Local Postgres, Redis, and Mailhog stack.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or any Docker Engine >= 24).
- Node.js 20.x (ships with `corepack`, which manages pnpm).
- pnpm 9.x (`corepack enable pnpm`).

## Local Development

1. **Clone & install**
   ```bash
   corepack enable pnpm
   pnpm install
   ```

2. **Create environment files**

   Create `.env` in the project root (optional, for Docker Compose overrides):
   ```env
   POSTGRES_USER=forum_user
   POSTGRES_PASSWORD=forum_pass
   POSTGRES_DB=forum_dev
   POSTGRES_PORT=5432
   REDIS_PORT=6379
   MAILHOG_SMTP_PORT=1025
   MAILHOG_DASHBOARD_PORT=8025
   ```

   Create `apps/api/.env`:
   ```env
   NODE_ENV=development
   PORT=4000
   DATABASE_URL=postgresql://forum_user:forum_pass@localhost:5432/forum_dev
   REDIS_URL=redis://localhost:6379
   MAILHOG_HOST=localhost
   MAILHOG_PORT=1025
   MAIL_FROM_ADDRESS=forum@example.com
   PUBLIC_APP_URL=http://localhost:3000
   JWT_ACCESS_TOKEN_SECRET=<generate-32-char-secret>
   JWT_ACCESS_TOKEN_TTL=15m
   JWT_REFRESH_TOKEN_SECRET=<generate-32-char-secret>
   JWT_REFRESH_TOKEN_TTL=30d
   ```

   Create `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

   **Generate JWT secrets** with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Start infrastructure (Postgres, Redis, Mailhog)**
   ```bash
   docker compose up -d
   ```
   - Postgres: `localhost:5432`
   - Redis: `localhost:6379`
   - Mailhog UI: http://localhost:8025 (SMTP on port 1025)

4. **Generate Prisma client and apply migrations**
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. **Run the apps (in separate terminals)**
   ```bash
   pnpm dev:api   # starts NestJS on http://localhost:4000/api
   pnpm dev:web   # starts Next.js on http://localhost:3000
   ```
   or run both via `pnpm dev`.

When the API boots, it will connect to the Compose services using the values from `apps/api/.env`. The web client uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api`).

## Database & Prisma

- Prisma schema lives in `prisma/schema.prisma`.
- Run `pnpm prisma:generate` after installing dependencies to create the Prisma client.
- Apply migrations with `pnpm prisma:migrate`.
- The NestJS API expects `DATABASE_URL` to point at the local Postgres instance from Docker Compose.

## API Endpoints

### Auth (`/api/auth`)
- `POST /register` - Create a new account
- `POST /verify-email` - Verify email with code
- `POST /verification/resend` - Resend verification email
- `POST /login` - Sign in and receive tokens
- `POST /refresh` - Refresh access token
- `POST /logout` - Invalidate refresh token
- `POST /password/request-reset` - Request password reset email
- `POST /password/reset` - Reset password with token

## Next Steps

- Flesh out shared types in `packages/shared`.
- Implement forum features (subcommunities, threads, posts, votes, messaging) as described in `agent.md`.
- Add rate limiting and automated tests as Phase 1 progresses.
