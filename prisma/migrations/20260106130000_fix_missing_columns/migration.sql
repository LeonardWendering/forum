-- This migration ensures all required columns exist (idempotent)
-- It handles the case where previous migration was recorded but not applied

-- Add restricted user fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "is_restricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restricted_to_subcommunity_id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registered_with_invite_id" TEXT;

-- Add muting fields to Subcommunity
ALTER TABLE "Subcommunity" ADD COLUMN IF NOT EXISTS "is_muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subcommunity" ADD COLUMN IF NOT EXISTS "muted_at" TIMESTAMP(3);
ALTER TABLE "Subcommunity" ADD COLUMN IF NOT EXISTS "muted_by_id" TEXT;

-- Add muting fields to Thread
ALTER TABLE "Thread" ADD COLUMN IF NOT EXISTS "is_muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Thread" ADD COLUMN IF NOT EXISTS "muted_at" TIMESTAMP(3);
ALTER TABLE "Thread" ADD COLUMN IF NOT EXISTS "muted_by_id" TEXT;

-- Add muting fields to Post
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "is_muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "muted_at" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "muted_by_id" TEXT;

-- Create InviteCode table if not exists
CREATE TABLE IF NOT EXISTS "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subcommunity_id" TEXT NOT NULL,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "uses_remaining" INTEGER,
    "expires_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- Create _UsedInviteCodes table if not exists
CREATE TABLE IF NOT EXISTS "_UsedInviteCodes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Create indexes if not exist
CREATE UNIQUE INDEX IF NOT EXISTS "InviteCode_code_key" ON "InviteCode"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "_UsedInviteCodes_AB_unique" ON "_UsedInviteCodes"("A", "B");
CREATE INDEX IF NOT EXISTS "_UsedInviteCodes_B_index" ON "_UsedInviteCodes"("B");

-- Add foreign keys (wrapped in DO blocks to handle if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_restricted_to_subcommunity_id_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_restricted_to_subcommunity_id_fkey"
        FOREIGN KEY ("restricted_to_subcommunity_id") REFERENCES "Subcommunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_registered_with_invite_id_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_registered_with_invite_id_fkey"
        FOREIGN KEY ("registered_with_invite_id") REFERENCES "InviteCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subcommunity_muted_by_id_fkey') THEN
        ALTER TABLE "Subcommunity" ADD CONSTRAINT "Subcommunity_muted_by_id_fkey"
        FOREIGN KEY ("muted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Thread_muted_by_id_fkey') THEN
        ALTER TABLE "Thread" ADD CONSTRAINT "Thread_muted_by_id_fkey"
        FOREIGN KEY ("muted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Post_muted_by_id_fkey') THEN
        ALTER TABLE "Post" ADD CONSTRAINT "Post_muted_by_id_fkey"
        FOREIGN KEY ("muted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InviteCode_subcommunity_id_fkey') THEN
        ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_subcommunity_id_fkey"
        FOREIGN KEY ("subcommunity_id") REFERENCES "Subcommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InviteCode_created_by_id_fkey') THEN
        ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_created_by_id_fkey"
        FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_UsedInviteCodes_A_fkey') THEN
        ALTER TABLE "_UsedInviteCodes" ADD CONSTRAINT "_UsedInviteCodes_A_fkey"
        FOREIGN KEY ("A") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_UsedInviteCodes_B_fkey') THEN
        ALTER TABLE "_UsedInviteCodes" ADD CONSTRAINT "_UsedInviteCodes_B_fkey"
        FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
