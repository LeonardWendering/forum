# Forum Monorepo

Privacy-first discussion forum with subcommunities, nested discussions, private messaging, and admin moderation. Hosted with Supabase (database), Render (API), and Vercel (web).

## Architecture

- Web: Next.js 14 App Router in `apps/web` (Vercel)
- API: NestJS 10 in `apps/api` (Render)
- DB: Supabase Postgres with Prisma migrations in `prisma/`
- Auth: JWT access/refresh tokens with DB-backed sessions (Argon2)
- Email: SMTP via `MAIL_*` env vars for verification and password reset

## Repo Layout

- `apps/web`: Next.js frontend (routes in `apps/web/src/app`)
- `apps/api`: NestJS backend (modules in `apps/api/src`)
- `prisma`: Prisma schema and migrations
- `packages/shared`: shared types/utilities (lightly used)

## Core Features

- Auth: register, verify email, login/refresh/logout, password reset, invite code validation
- Forum: subcommunities (public/invite/password), memberships, threads, posts with nested replies, voting
- Messaging: conversations and messages
- Profiles: avatars, memberships, threads, posts
- Admin: invite codes, user suspend/delete, subcommunity visibility/mute, thread/post mute, vote breakdown visibility

## Key Web Routes

- `/` (landing)
- `/communities`, `/c/[slug]`, `/c/[slug]/new`
- `/t/[threadId]`
- `/messages`, `/messages/[conversationId]`
- `/u/[userId]`
- `/admin`, `/admin/invite-codes`, `/admin/users`, `/admin/subcommunities`

## Deployment

### Render (API)

Service setup:
- Root directory: `apps/api`
- Build command:
  ```bash
  npm run render-build
  ```
- Start command:
  ```bash
  cd ../.. && npx prisma migrate deploy && cd apps/api && npm start
  ```

Required env vars (Render):
- `DATABASE_URL`
- `JWT_ACCESS_TOKEN_SECRET`
- `JWT_REFRESH_TOKEN_SECRET`
- `JWT_ACCESS_TOKEN_TTL` (default 15m)
- `JWT_REFRESH_TOKEN_TTL` (default 30d)
- `PUBLIC_APP_URL` (Vercel URL)
- `MAIL_FROM_ADDRESS`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` (SMTP)
- `SKIP_EMAIL_VERIFICATION=true` (optional, for testing flows)

### Vercel (Web)

Project setup:
- Root directory: `apps/web`
- Build command: `npm run build`

Required env vars (Vercel):
- `NEXT_PUBLIC_API_URL=https://forum-api-kkg0.onrender.com/api`

## Database Migrations (Supabase)

- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations`
- Render runs `npx prisma migrate deploy` on each deploy via the start command.
- If API logs mention missing columns (e.g. `User.is_restricted`), run migrations in the Render shell or apply the latest migration SQL in Supabase.

## Working on Features

- Frontend pages: `apps/web/src/app`
- Shared UI components: `apps/web/src/components`
- API modules: `apps/api/src` (`auth`, `profile`, `subcommunities`, `threads`, `posts`, `messages`, `admin`)
- Prisma models: `prisma/schema.prisma`
