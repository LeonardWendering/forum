# Forum Monorepo

Privacy-first discussion forum with subcommunities, nested discussions, private messaging, and admin moderation. Hosted with Supabase (database), Render (API), and Vercel (web).

## Architecture

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | Next.js 14 (App Router) + TailwindCSS | `apps/web` (Vercel) |
| Backend | NestJS 10 + TypeScript | `apps/api` (Render) |
| Database | PostgreSQL + Prisma ORM | Supabase |
| Auth | JWT (access + refresh tokens) + Argon2 | DB-backed sessions |
| Email | SMTP (Postmark, SendGrid, etc.) | Verification + password reset |

## Repository Structure

```
forum_code/
├── apps/
│   ├── api/                      # NestJS backend
│   │   └── src/
│   │       ├── admin/            # Admin endpoints (invite codes, user mgmt, moderation)
│   │       ├── auth/             # Auth (register, login, JWT, guards)
│   │       ├── messages/         # Private messaging
│   │       ├── posts/            # Posts with voting and replies
│   │       ├── profile/          # User profiles
│   │       ├── subcommunities/   # Communities CRUD
│   │       ├── threads/          # Discussion threads
│   │       ├── common/           # Shared utilities
│   │       ├── config/           # Env validation
│   │       ├── database/         # Prisma service
│   │       └── mail/             # Email service
│   └── web/                      # Next.js frontend
│       └── src/
│           ├── app/              # Routes (pages)
│           │   ├── (auth)/       # Login, register, verify, reset
│           │   └── (forum)/      # Communities, threads, messages, admin
│           ├── components/       # UI components
│           │   ├── ui/           # Button, Card, Input, Alert, Avatar
│           │   ├── forum/        # PostCard, ThreadCard, SubcommunityCard
│           │   └── layout/       # Header
│           ├── context/          # AuthContext
│           └── lib/              # API client, types
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # SQL migrations
└── packages/shared/              # Shared types (optional)
```

## Core Features

### Authentication
- Email/password registration with verification code
- JWT access/refresh token flow
- Password reset via email
- Invite codes for restricted registration

### Forum
- Subcommunities: PUBLIC, INVITE_ONLY, PASSWORD_PROTECTED
- Threads with pinning/locking
- Nested post replies (unlimited depth)
- Upvote/downvote system (scores visible to admins only)

### User Profiles
- Custom avatars (body type, skin color, hairstyle, accessory)
- View user's communities, threads, and posts
- Direct messaging between users

### Admin Features
- Create invite codes (optional usage limits, expiration, restricted flag)
- Suspend/unsuspend/delete users
- Mute/unmute subcommunities, threads, and posts
- Change subcommunity visibility type
- Restricted accounts (can only access invited community)

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with latest posts |
| `/login`, `/register` | Authentication |
| `/verify-email`, `/forgot-password`, `/reset-password` | Auth flows |
| `/communities` | List all communities |
| `/communities/new` | Create new community |
| `/c/[slug]` | View community + threads |
| `/c/[slug]/new` | Create new thread |
| `/t/[threadId]` | View thread + posts |
| `/messages` | Conversation inbox |
| `/messages/[id]` | Chat view |
| `/u/[userId]` | User profile (communities, threads, posts) |
| `/setup-avatar` | Avatar customization |
| `/admin` | Admin dashboard |
| `/admin/invite-codes` | Manage invite codes |
| `/admin/users` | User management |
| `/admin/subcommunities` | Community moderation |

## API Endpoints

### Auth (`/api/auth/`)
- `POST /register` - Create account (optional `inviteCode`)
- `POST /verify-email` - Verify with 6-digit code
- `POST /login` - Get JWT tokens
- `POST /refresh` - Refresh access token
- `POST /logout` - Revoke session
- `POST /validate-invite-code` - Check invite code validity

### Profile (`/api/`)
- `GET /profile/me` - Current user profile
- `PATCH /profile/me/avatar` - Update avatar
- `DELETE /profile/me` - Delete account
- `GET /users/:userId` - Public profile
- `GET /users/:userId/memberships` - User's communities
- `GET /users/:userId/posts` - User's posts
- `GET /users/:userId/threads` - User's threads

### Forum
- `GET/POST /subcommunities` - List/create communities
- `GET /subcommunities/:slug` - Community details
- `POST /subcommunities/:slug/join` - Join community
- `GET /subcommunities/:slug/threads` - List threads
- `POST /subcommunities/:slug/threads` - Create thread
- `GET /threads/:id` - Thread details
- `GET /threads/:id/posts` - List posts
- `POST /threads/:id/posts` - Create post/reply
- `POST /posts/:id/vote` - Vote on post
- `GET /posts/recent` - Latest posts

### Messages
- `GET/POST /conversations` - List/create conversations
- `GET /conversations/:id/messages` - Get messages
- `POST /conversations/:id/messages` - Send message

### Admin (`/api/admin/`) - Requires ADMIN role
- `GET/POST /invite-codes` - List/create invite codes
- `DELETE /invite-codes/:id` - Delete invite code
- `GET /users` - List all users
- `GET /users/:userId` - Get user details
- `PATCH /users/:userId/suspend` - Suspend user
- `PATCH /users/:userId/unsuspend` - Unsuspend user
- `DELETE /users/:userId` - Delete user
- `POST /subcommunities/:id/mute` - Mute community
- `POST /threads/:id/mute` - Mute thread
- `POST /posts/:id/mute` - Mute post

## Deployment

### Render (API)

**Service Configuration:**
- Root directory: `apps/api`
- Build command: `npm run render-build`
- Start command: `cd ../.. && npx prisma migrate deploy && cd apps/api && npm start`

**Environment Variables:**
```
DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/postgres
JWT_ACCESS_TOKEN_SECRET=<random-64-char-string>
JWT_REFRESH_TOKEN_SECRET=<random-64-char-string>
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=30d
PUBLIC_APP_URL=https://your-app.vercel.app
MAIL_HOST=smtp.postmarkapp.com
MAIL_PORT=587
MAIL_USER=<postmark-token>
MAIL_PASS=<postmark-token>
MAIL_FROM_ADDRESS=noreply@yourdomain.com
SKIP_EMAIL_VERIFICATION=true  # Optional, for testing
```

### Vercel (Web)

**Project Configuration:**
- Root directory: `apps/web`
- Build command: `npm run build`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api
```

## Database

### Schema Overview

| Model | Purpose |
|-------|---------|
| User | Accounts with role (USER/ADMIN), status, restricted flag |
| Profile | Avatar configuration, bio |
| Session | JWT session tracking |
| Subcommunity | Communities with type (PUBLIC/INVITE_ONLY/PASSWORD_PROTECTED) |
| Membership | User-community relationship with role |
| Thread | Discussion threads (pinnable, lockable, mutable) |
| Post | Posts with nested replies, voting |
| Vote | Upvotes/downvotes on posts |
| Conversation | Two-user messaging |
| Message | Private messages with read receipts |
| InviteCode | Registration invite codes with restrictions |

### Migrations

Prisma migrations are in `prisma/migrations/`. Render's start command runs `npx prisma migrate deploy` automatically.

If you see errors like `column does not exist`:
1. Check if migration files exist in `prisma/migrations/`
2. If missing, create a new migration with the schema changes
3. Commit and push - Render will apply on next deploy

To apply migrations manually via Supabase SQL Editor:
1. Go to Supabase Dashboard > SQL Editor
2. Run the SQL from the latest migration file

## Development

### Prerequisites
- Node.js 20+
- pnpm 8+

### Setup
```bash
pnpm install
pnpm prisma:generate
```

### Making Changes

**Frontend:**
- Pages: `apps/web/src/app/(forum)/`
- Components: `apps/web/src/components/`
- API client: `apps/web/src/lib/forum-api.ts`
- Types: `apps/web/src/lib/forum-types.ts`

**Backend:**
- Controllers: `apps/api/src/*/[name].controller.ts`
- Services: `apps/api/src/*/[name].service.ts`
- DTOs: `apps/api/src/*/dto/`

**Database:**
- Schema: `prisma/schema.prisma`
- After schema changes, create a migration file in `prisma/migrations/`

## Promoting a User to Admin

Use Supabase SQL Editor:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'user@example.com';
```

Or use Supabase Table Editor to change the `role` column directly.

## Troubleshooting

### API returns "Internal Server Error"
- Check Render logs for the actual error
- Usually means a database column is missing - apply migrations

### Profile/Communities not loading
- Verify the migration with `is_restricted`, `is_muted` columns was applied
- Check browser console for API errors

### Admin buttons not showing
- Ensure user has `role = 'ADMIN'` in database
- Clear browser cache and re-login to refresh JWT

### Invite codes not working
- Ensure `InviteCode` table exists (run migrations)
- Check code hasn't expired or run out of uses
