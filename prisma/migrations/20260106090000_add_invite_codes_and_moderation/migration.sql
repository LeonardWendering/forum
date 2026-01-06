-- Add restricted user fields
ALTER TABLE "User" ADD COLUMN "is_restricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "restricted_to_subcommunity_id" TEXT;
ALTER TABLE "User" ADD COLUMN "registered_with_invite_id" TEXT;

-- Add muting fields to Subcommunity
ALTER TABLE "Subcommunity" ADD COLUMN "is_muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subcommunity" ADD COLUMN "muted_at" TIMESTAMP(3);
ALTER TABLE "Subcommunity" ADD COLUMN "muted_by_id" TEXT;

-- Add muting fields to Thread
ALTER TABLE "Thread" ADD COLUMN "is_muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Thread" ADD COLUMN "muted_at" TIMESTAMP(3);
ALTER TABLE "Thread" ADD COLUMN "muted_by_id" TEXT;

-- Add muting fields to Post
ALTER TABLE "Post" ADD COLUMN "is_muted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "muted_at" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "muted_by_id" TEXT;

-- CreateTable InviteCode
CREATE TABLE "InviteCode" (
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

-- CreateTable for many-to-many relation
CREATE TABLE "_UsedInviteCodes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "_UsedInviteCodes_AB_unique" ON "_UsedInviteCodes"("A", "B");

-- CreateIndex
CREATE INDEX "_UsedInviteCodes_B_index" ON "_UsedInviteCodes"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restricted_to_subcommunity_id_fkey" FOREIGN KEY ("restricted_to_subcommunity_id") REFERENCES "Subcommunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_registered_with_invite_id_fkey" FOREIGN KEY ("registered_with_invite_id") REFERENCES "InviteCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcommunity" ADD CONSTRAINT "Subcommunity_muted_by_id_fkey" FOREIGN KEY ("muted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_muted_by_id_fkey" FOREIGN KEY ("muted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_muted_by_id_fkey" FOREIGN KEY ("muted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_subcommunity_id_fkey" FOREIGN KEY ("subcommunity_id") REFERENCES "Subcommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UsedInviteCodes" ADD CONSTRAINT "_UsedInviteCodes_A_fkey" FOREIGN KEY ("A") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UsedInviteCodes" ADD CONSTRAINT "_UsedInviteCodes_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
