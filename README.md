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
| Setting | Value |
|---------|-------|
| Root Directory | `apps/api` |
| Build Command | `npm run render-build` |
| Start Command | `cd ../.. && npx prisma migrate deploy && cd apps/api && npm start` |

The start command navigates to the project root to run Prisma migrations (since `prisma/` is at root level), then returns to `apps/api` to start the server.

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

### Styling Guidelines

**Color Scheme:**
- Primary color: Blue (`blue-600` for buttons, `blue-100` for backgrounds)
- All buttons should use blue variants, never grey
- Admin elements use purple (`purple-600`)
- Danger/destructive actions use red (`red-600`)

**Button Variants:**
- `primary`: Solid blue background, white text
- `secondary`: Light blue background, blue text
- `outline`: Blue border, blue text, light blue hover
- `ghost`: Blue text, light blue hover background
- `danger`: Red background for destructive actions

**UI Consistency:**
- "Welcome, username" message appears only on the landing page
- Header shows single "Profile" link (not duplicate username link)
- Admin/Restricted badges appear next to Profile link in header

## Promoting a User to Admin

Use Supabase SQL Editor:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'user@example.com';
```

Or use Supabase Table Editor to change the `role` column directly.

## Troubleshooting

### API returns "Internal Server Error"
- Check Render logs for the actual error
- Usually means a database column is missing - see migration fix below

### Migrations recorded but not applied
If Render logs show "No pending migrations to apply" but columns don't exist:
1. Create a new migration with `IF NOT EXISTS` clauses (see `20260106130000_fix_missing_columns`)
2. Push to git - Render will see it as a new pending migration
3. The idempotent SQL will work whether columns exist or not

### Profile/Communities not loading
- Verify the migration with `is_restricted`, `is_muted` columns was applied
- Check browser console for API errors
- Trigger a manual redeploy on Render if migrations haven't applied

### Admin buttons not showing
- Ensure user has `role = 'ADMIN'` in database
- Clear browser cache and re-login to refresh JWT

### Invite codes not working
- Ensure `InviteCode` table exists (run migrations)
- Check code hasn't expired or run out of uses

---

## Bot Automation System (Future Implementation)

This section documents the planned implementation for automated bot posting, adapted from the Reddit automation system in `automated_posting/`.

### Overview

The bot system enables:
- Creating private communities with random names for research studies
- Creating bot accounts without email verification
- Automated posting and replying on schedules
- Orchestrating multiple communities with different bot configurations

### Implementation Plan

#### Phase 1: Backend API Extensions

**1.1 Community Name Generator** (`apps/api/src/common/utils/community-name.ts`)
```
- Generate names like: "SunnyMeadow", "CozyHarbor", "MaplePond"
- Format: [Adjective][Noun] or [Nature word][Place word]
- Ensure uniqueness by checking existing slugs
```

**1.2 Admin Bot Creation Endpoint** (`POST /api/admin/bots`)
```
Request:
{
  "displayName": "string",           // or null to auto-generate
  "subcommunityId": "string",        // community to join
  "avatarConfig": {                  // optional, will randomize if not provided
    "bodyType": "MALE" | "FEMALE" | "NEUTRAL" | "random",
    "skinColor": "LIGHT" | "MEDIUM" | "DARK" | "random",
    "hairstyle": "random" | specific value,
    "accessory": "random" | specific value
  },
  "avatarRules": {                   // for batch creation
    "bodyTypeDistribution": { "MALE": 50, "FEMALE": 50 },
    "accessoryChance": 30            // % chance of having accessory
  }
}

Response:
{
  "id": "user-id",
  "displayName": "generated-name",
  "accessToken": "jwt-token",        // bot's auth token
  "refreshToken": "jwt-token"
}
```

**1.3 Admin Batch Bot Creation** (`POST /api/admin/bots/batch`)
```
Request:
{
  "count": 10,
  "subcommunityId": "string",
  "avatarRules": { ... }
}

Response:
{
  "bots": [{ id, displayName, accessToken, refreshToken }, ...]
}
```

**1.4 Admin Community Creation with Random Name** (`POST /api/admin/communities`)
```
Request:
{
  "nameStyle": "nature" | "cozy" | "friendly",  // name generation style
  "type": "INVITE_ONLY",
  "description": "string"
}

Response:
{
  "id": "community-id",
  "name": "SunnyMeadow",
  "slug": "sunny-meadow",
  "inviteCode": "AUTO-GENERATED-CODE"
}
```

#### Phase 2: Bot Posting Endpoints

**2.1 Bot Thread Creation** (`POST /api/bot/threads`)
```
Headers: Authorization: Bearer <bot-access-token>
Request:
{
  "subcommunitySlug": "string",
  "title": "string",
  "content": "string"
}
```

**2.2 Bot Post/Reply** (`POST /api/bot/posts`)
```
Headers: Authorization: Bearer <bot-access-token>
Request:
{
  "threadId": "string",
  "content": "string",
  "parentPostId": "string" | null    // for nested replies
}
```

#### Phase 3: Python Orchestration Client

**3.1 Forum API Client** (`automated_posting/src/forum_provider.py`)
```python
class ForumProvider:
    def __init__(self, api_url: str, admin_token: str):
        self.api_url = api_url
        self.admin_token = admin_token
        self.bot_tokens: Dict[str, str] = {}

    def create_community(self, name_style: str) -> dict:
        # POST /api/admin/communities

    def create_bots(self, count: int, community_id: str, avatar_rules: dict) -> list:
        # POST /api/admin/bots/batch

    def submit_post(self, bot_id: str, subreddit: str, title: str,
                    body: str, kind: str, parent_id: str = None) -> str:
        # Uses bot's token to POST thread or reply
```

**3.2 Config Adaptations**

`config/communities.yaml`:
```yaml
communities:
  - name_style: nature
    bot_count: 10
    avatar_rules:
      bodyTypeDistribution: { MALE: 40, FEMALE: 40, NEUTRAL: 20 }
      accessoryChance: 25
    active: true
```

`config/forum_app.yaml`:
```yaml
api_url: https://forum-api-xxx.onrender.com/api
admin_email: admin@example.com
admin_password: <from-env>
timezone: Europe/Berlin
sleep_between_posts_seconds: 3
```

#### Phase 4: Schedule Format

Same CSV format as Reddit, with columns:
```
datetime,time,account,title,body,kind,reply_to,community
```

- `account`: Bot persona name (mapped to real bot via `state/account_mapping.json`)
- `kind`: "self" (new thread) or "comment" (reply)
- `reply_to`: Hierarchical reference (0, 1, 1.1, 2.1.1, etc.)
- `community`: Target community slug (or uses default)

#### Phase 5: Execution Flow

1. **Setup Phase** (run once per study):
   ```bash
   python -m src.main --init-forum
   ```
   - Creates communities with random names
   - Creates bot accounts with avatar distribution
   - Generates invite codes
   - Saves state to `state/forum_setup.json`

2. **Posting Phase** (scheduled via Task Scheduler):
   ```bash
   python -m src.main run-once --platform forum
   ```
   - Loads schedule CSV
   - Filters by current day per community
   - Executes posts via Forum API
   - Logs to `state/posted_log.jsonl`

3. **Monitoring**:
   ```bash
   python -m src.main --status --platform forum
   ```

### Database Changes Needed

```sql
-- Add bot flag to User table
ALTER TABLE "User" ADD COLUMN "is_bot" BOOLEAN NOT NULL DEFAULT false;

-- Add created_by for bot accounts
ALTER TABLE "User" ADD COLUMN "created_by_admin_id" TEXT;
```

### Security Considerations

- Bot tokens should have limited scope (only post to assigned community)
- Rate limiting on bot endpoints
- Audit log for all bot actions
- Admin-only access to bot management endpoints

### Files to Create/Modify

**Backend (apps/api/src/):**
1. `common/utils/community-name.ts` - Name generator
2. `admin/dto/create-bot.dto.ts` - Bot creation DTO
3. `admin/dto/create-community.dto.ts` - Community creation DTO
4. `admin/admin.controller.ts` - Add bot endpoints
5. `admin/admin.service.ts` - Bot creation logic
6. `auth/auth.service.ts` - Bot token generation (no email)

**Python Client (automated_posting/src/):**
1. `forum_provider.py` - Forum API client
2. `forum_main.py` - Forum-specific entry point
3. Modify `main.py` - Add `--platform forum` flag

**Migrations:**
1. `prisma/migrations/YYYYMMDD_add_bot_fields/migration.sql`

### Estimated Implementation Order

1. Community name generator + admin community endpoint
2. Bot user creation endpoint (single + batch)
3. Bot posting endpoints
4. Python Forum provider class
5. Integration with existing schedule system
6. Testing with sample community + bots
