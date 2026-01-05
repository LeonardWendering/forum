# Claude Development Guide

This document provides everything needed to continue and complete the forum project.

## Project Summary

**Goal:** Build a privacy-first discussion forum (Reddit-like) with subcommunities, nested discussions, private messaging, and admin-only vote visibility.

**Current State:** FULLY FUNCTIONAL - Both backend API and frontend are complete and ready for testing.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14 (App Router) + TypeScript + TailwindCSS | `apps/web` |
| Backend | NestJS 10 + TypeScript | `apps/api` |
| Database | PostgreSQL 16 + Prisma ORM | Schema in `prisma/schema.prisma` |
| Cache | Redis 7 | For sessions, rate limits (available for future use) |
| Email | Mailhog (dev) / Postmark (prod) | Nodemailer transport |
| Auth | JWT (access + refresh tokens) + Argon2 | Sessions stored in DB |

---

## Project Structure

```
forum_code/
├── apps/
│   ├── api/                    # NestJS backend
│   │   └── src/
│   │       ├── app/            # Root module
│   │       ├── auth/           # Auth module with JWT strategy/guards
│   │       ├── subcommunities/ # Subcommunities CRUD
│   │       ├── threads/        # Threads CRUD
│   │       ├── posts/          # Posts with voting
│   │       ├── messages/       # Private messaging
│   │       ├── common/utils/   # Token generation, duration parsing
│   │       ├── config/         # Zod env validation
│   │       ├── database/       # Prisma service
│   │       └── mail/           # Email service (Mailhog)
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # Auth pages (login, register, etc.)
│           │   └── (forum)/    # Forum pages (communities, threads, messages)
│           ├── components/
│           │   ├── ui/         # Button, Input, Card, Alert, etc.
│           │   ├── forum/      # PostCard, ThreadCard, etc.
│           │   └── layout/     # Header
│           ├── context/        # AuthContext
│           ├── lib/            # API client, types
│           └── styles/         # Global CSS + Tailwind
├── packages/
│   └── shared/                 # Shared types (available for future use)
├── prisma/
│   └── schema.prisma           # Database schema
└── docker-compose.yml          # Postgres, Redis, Mailhog
```

---

## What's Complete

### Backend Auth (`apps/api/src/auth/`)
- `POST /api/auth/register` - Create account, send verification email
- `POST /api/auth/verify-email` - Verify with 6-digit code
- `POST /api/auth/verification/resend` - Resend verification email
- `POST /api/auth/login` - Returns JWT access + refresh tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Revoke refresh token/session
- `POST /api/auth/password/request-reset` - Send reset email
- `POST /api/auth/password/reset` - Reset password with token

### JWT Auth System (`apps/api/src/auth/`)
- `strategies/jwt.strategy.ts` - Passport-JWT strategy for token validation
- `guards/jwt-auth.guard.ts` - Global auth guard with @Public() decorator support
- `guards/roles.guard.ts` - Role-based access control (USER, ADMIN)
- `decorators/current-user.decorator.ts` - Extract user from request
- `decorators/public.decorator.ts` - Mark routes as public
- `decorators/roles.decorator.ts` - Require specific roles

### Subcommunities API (`apps/api/src/subcommunities/`)
- `GET /api/subcommunities` - List all public + user's private subcommunities
- `GET /api/subcommunities/:slug` - Get single subcommunity with membership info
- `POST /api/subcommunities` - Create new subcommunity
- `PATCH /api/subcommunities/:slug` - Update subcommunity (owner only)
- `DELETE /api/subcommunities/:slug` - Delete subcommunity (owner only)
- `POST /api/subcommunities/:slug/join` - Join subcommunity (handles password)
- `DELETE /api/subcommunities/:slug/leave` - Leave subcommunity

### Threads API (`apps/api/src/threads/`)
- `GET /api/subcommunities/:slug/threads` - List threads with pagination
- `GET /api/threads/:id` - Get single thread with author info
- `POST /api/subcommunities/:slug/threads` - Create thread
- `PATCH /api/threads/:id` - Update thread (author only)
- `DELETE /api/threads/:id` - Delete thread (author or moderator)

### Posts API (`apps/api/src/posts/`)
- `GET /api/threads/:threadId/posts` - List posts with nested replies
- `GET /api/posts/:id` - Get single post
- `POST /api/threads/:threadId/posts` - Create post or reply
- `PATCH /api/posts/:id` - Update post (author only)
- `DELETE /api/posts/:id` - Soft delete post
- `POST /api/posts/:id/vote` - Upvote/downvote
- `DELETE /api/posts/:id/vote` - Remove vote
- `GET /api/posts/:id/votes` - View vote breakdown (admin only)

### Messages API (`apps/api/src/messages/`)
- `GET /api/conversations` - List user's conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `GET /api/conversations/:id/messages` - Get paginated messages
- `POST /api/conversations` - Start new conversation
- `POST /api/conversations/:id/messages` - Send message
- `PATCH /api/conversations/:id/read` - Mark conversation as read
- `GET /api/messages/unread-count` - Get total unread count

### Database Schema (Prisma)
- `User` - id, email, passwordHash, displayName, role, status, emailVerifiedAt
- `Profile` - userId, avatarUrl, bio, timezone
- `EmailVerificationToken` - 6-digit codes, expiry
- `PasswordResetToken` - Reset tokens, expiry
- `Session` - JWT session tracking with device/IP
- `Subcommunity` - Communities with PUBLIC, INVITE_ONLY, PASSWORD_PROTECTED types
- `Membership` - User-subcommunity relationship with roles
- `Thread` - Discussion threads with pinning/locking
- `Post` - Posts with nested replies (parentId)
- `Vote` - Upvotes/downvotes on posts
- `Conversation` - Two-user conversations
- `Message` - Private messages with read receipts

### Frontend Auth
- Auth context with token management and auto-refresh
- API client with automatic token attachment and 401 handling
- Login page with form validation
- Register page with password requirements
- Email verification page (6-digit code)
- Forgot password page
- Reset password page

### Frontend Forum
- Communities list page (`/communities`)
- Create community page (`/communities/new`)
- Subcommunity detail page (`/c/[slug]`)
- Create thread page (`/c/[slug]/new`)
- Thread detail page with nested posts (`/t/[threadId]`)
- Messages inbox (`/messages`)
- Conversation chat view (`/messages/[conversationId]`)

### UI Components
- Button (variants: primary, secondary, outline, ghost; sizes: sm, md, lg)
- Input, FormField (with labels and error states)
- Alert (variants: info, success, warning, error)
- Card, CardHeader, CardContent, CardFooter
- SubcommunityCard, ThreadCard, PostCard
- PostComposer (textarea for posts/replies)
- Header with navigation and auth status

---

## Testing Locally

### Prerequisites
- Node.js 20+
- pnpm 8+ (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL, Redis, Mailhog)

### Step 1: Start Infrastructure

```powershell
# Navigate to project directory
cd /path/to/forum_code

# Start PostgreSQL, Redis, and Mailhog
docker compose up -d

# Verify containers are running
docker compose ps
```

Expected output:
```
NAME                    STATUS
forum_code-mailhog-1    Up
forum_code-postgres-1   Up
forum_code-redis-1      Up
```

### Step 2: Install Dependencies

```powershell
pnpm install
```

### Step 3: Generate Prisma Client

```powershell
pnpm prisma:generate
```

### Step 4: Run Database Migrations

```powershell
pnpm prisma:migrate
```

### Step 5: Start the Applications

Open two terminal windows:

**Terminal 1 - Backend API:**
```powershell
pnpm dev:api
```

**Terminal 2 - Frontend:**
```powershell
pnpm dev:web
```

### Step 6: Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main application |
| API | http://localhost:4000/api | Backend API |
| Mailhog | http://localhost:8025 | Email testing UI |

### Testing Flow

1. **Register a new account:**
   - Go to http://localhost:3000/register
   - Fill in email, display name, and password
   - Click "Create Account"

2. **Verify email:**
   - Open Mailhog at http://localhost:8025
   - Find the verification email
   - Copy the 6-digit code
   - Enter on the verification page

3. **Login:**
   - Go to http://localhost:3000/login
   - Enter credentials

4. **Create a community:**
   - Go to http://localhost:3000/communities
   - Click "New Community"
   - Fill in details and create

5. **Create a thread:**
   - Navigate to your community
   - Click "New Thread"
   - Add title and content

6. **Test messaging:**
   - Create a second user (different browser/incognito)
   - Start a conversation from a user's profile or thread

### Testing API with PowerShell

```powershell
# Register
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","displayName":"Test User","password":"Password123!"}'

# Check Mailhog for verification code at http://localhost:8025

# Verify email (replace XXXXXX with actual code)
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/verify-email" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","code":"XXXXXX"}'

# Login
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"Password123!"}'
$token = $response.tokens.accessToken

# Create subcommunity
Invoke-RestMethod -Uri "http://localhost:4000/api/subcommunities" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"name":"Test Community","slug":"test-community","description":"A test community","type":"PUBLIC"}'

# List subcommunities
Invoke-RestMethod -Uri "http://localhost:4000/api/subcommunities" -Headers @{Authorization="Bearer $token"}

# Create thread
Invoke-RestMethod -Uri "http://localhost:4000/api/subcommunities/test-community/threads" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"title":"First Thread","content":"This is the first post content"}'
```

---

## Hosting on a Public Server

### Option 1: Railway (Recommended for simplicity)

Railway provides easy deployment with managed PostgreSQL and Redis.

#### Step 1: Prepare the Project

1. Create `apps/api/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
COPY prisma/ ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/

# Build
RUN pnpm --filter api build
RUN pnpm prisma generate

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
```

2. Create `apps/web/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web/ ./apps/web/

# Set build-time env (will be overridden at runtime)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build
RUN pnpm --filter web build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

3. Update `apps/web/next.config.ts` to enable standalone output:
```typescript
const nextConfig = {
  output: 'standalone',
  // ... other config
};
```

#### Step 2: Create Railway Project

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project"
3. Select "Empty Project"

#### Step 3: Add PostgreSQL

1. Click "New" in your project
2. Select "Database" > "PostgreSQL"
3. Wait for provisioning
4. Note the `DATABASE_URL` from the Variables tab

#### Step 4: Add Redis (Optional)

1. Click "New" in your project
2. Select "Database" > "Redis"
3. Note the `REDIS_URL` from the Variables tab

#### Step 5: Deploy API

1. Click "New" > "GitHub Repo"
2. Select your repository
3. Set the root directory to `apps/api`
4. Add environment variables:

```
NODE_ENV=production
PORT=4000
DATABASE_URL=<from PostgreSQL service>
REDIS_URL=<from Redis service>
JWT_ACCESS_TOKEN_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_TOKEN_SECRET=<generate: openssl rand -hex 32>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
EMAIL_VERIFICATION_EXPIRY=24h
PASSWORD_RESET_EXPIRY=1h
MAIL_HOST=smtp.postmarkapp.com
MAIL_PORT=587
MAIL_USER=<your-postmark-server-token>
MAIL_PASS=<your-postmark-server-token>
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME=Forum
PUBLIC_APP_URL=https://your-web-domain.up.railway.app
CORS_ORIGIN=https://your-web-domain.up.railway.app
```

5. Deploy and generate a domain

#### Step 6: Run Migrations

After API is deployed, open the Railway shell:
1. Select API service
2. Click "Shell" tab
3. Run: `npx prisma migrate deploy`

#### Step 7: Deploy Frontend

1. Click "New" > "GitHub Repo"
2. Select your repository
3. Set the root directory to `apps/web`
4. Add environment variables:

```
NEXT_PUBLIC_API_URL=https://your-api-domain.up.railway.app/api
```

5. Deploy and generate a domain

### Option 2: VPS (DigitalOcean, Hetzner, etc.)

For more control, deploy to a VPS with Docker Compose.

#### Step 1: Provision Server

1. Create a VPS with Ubuntu 22.04 (2GB RAM minimum)
2. SSH into the server
3. Install Docker:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

#### Step 2: Clone Repository

```bash
git clone <your-repo-url>
cd forum_code
```

#### Step 3: Create Production docker-compose.prod.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: forum
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: forum
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    depends_on:
      - postgres
      - redis
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://forum:${POSTGRES_PASSWORD}@postgres:5432/forum
      REDIS_URL: redis://redis:6379
      JWT_ACCESS_TOKEN_SECRET: ${JWT_ACCESS_TOKEN_SECRET}
      JWT_REFRESH_TOKEN_SECRET: ${JWT_REFRESH_TOKEN_SECRET}
      JWT_ACCESS_TOKEN_EXPIRY: 15m
      JWT_REFRESH_TOKEN_EXPIRY: 7d
      EMAIL_VERIFICATION_EXPIRY: 24h
      PASSWORD_RESET_EXPIRY: 1h
      MAIL_HOST: smtp.postmarkapp.com
      MAIL_PORT: 587
      MAIL_USER: ${POSTMARK_TOKEN}
      MAIL_PASS: ${POSTMARK_TOKEN}
      MAIL_FROM_ADDRESS: ${MAIL_FROM_ADDRESS}
      MAIL_FROM_NAME: Forum
      PUBLIC_APP_URL: ${PUBLIC_URL}
      CORS_ORIGIN: ${PUBLIC_URL}
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${PUBLIC_URL}/api
    depends_on:
      - api
    environment:
      NODE_ENV: production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - web
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Step 4: Create .env.production

```bash
POSTGRES_PASSWORD=<generate-strong-password>
JWT_ACCESS_TOKEN_SECRET=<openssl rand -hex 32>
JWT_REFRESH_TOKEN_SECRET=<openssl rand -hex 32>
POSTMARK_TOKEN=<your-postmark-server-token>
MAIL_FROM_ADDRESS=noreply@yourdomain.com
PUBLIC_URL=https://yourdomain.com
```

#### Step 5: Create nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:4000;
    }

    upstream web {
        server web:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location /api {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### Step 6: Deploy

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Set up SSL with Certbot (first time only)
docker run -it --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  -v ./certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  --email your@email.com \
  --agree-tos

# Restart nginx to pick up certificates
docker compose -f docker-compose.prod.yml restart nginx
```

### Production Email Setup (Postmark)

1. Sign up at https://postmarkapp.com
2. Create a Server
3. Add and verify your sending domain
4. Get the Server API Token
5. Use it as `MAIL_USER` and `MAIL_PASS`

---

## Future Improvements (Optional)

### Rate Limiting
Install `@nestjs/throttler` and add to `app.module.ts`:
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

### Admin Dashboard
Create admin pages in `apps/web/src/app/admin/`:
- User management
- Content moderation
- Analytics

### Real-time Features
Add WebSocket support for:
- Live message notifications
- Real-time thread updates
- Online user presence

---

## Progress Checklist

- [x] Project scaffolding (monorepo, Next.js, NestJS)
- [x] Docker Compose (Postgres, Redis, Mailhog)
- [x] Prisma setup + User schema
- [x] Auth API (register, login, verify, reset password)
- [x] Email service (Mailhog for dev)
- [x] CORS configuration
- [x] JWT auth guard + strategy
- [x] Forum schema (Subcommunity, Thread, Post, Vote, Message)
- [x] Subcommunities API
- [x] Threads API
- [x] Posts API (with nested replies)
- [x] Votes API (admin-only visibility)
- [x] Messages API
- [x] Frontend auth context
- [x] Frontend auth pages (login, register, verify, reset)
- [x] Frontend forum pages (communities, threads)
- [x] Frontend messaging
- [ ] Rate limiting (optional)
- [ ] Admin dashboard (optional)
- [ ] Dockerfiles for production
- [ ] Production deployment

---

## Troubleshooting

### Prisma generate fails with EPERM
If you see "EPERM: operation not permitted", close any IDEs (VS Code, Cursor) that have the project open, delete the locked file in `node_modules/.prisma/client`, and run `pnpm prisma:generate` again.

### API returns 401 Unauthorized
- Check that the access token is valid
- Tokens expire after 15 minutes - use the refresh token endpoint
- Ensure the Authorization header format is `Bearer <token>`

### Email not received
- Check Mailhog at http://localhost:8025
- In production, verify Postmark domain settings
- Check spam folder

### Database connection failed
- Ensure Docker containers are running: `docker compose ps`
- Check `DATABASE_URL` in `.env`
- For production, verify the connection string format
