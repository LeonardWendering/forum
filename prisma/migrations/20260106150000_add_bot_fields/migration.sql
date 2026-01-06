-- Add bot account fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "is_bot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "created_by_admin_id" TEXT;

-- Add foreign key constraint for created_by_admin_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_created_by_admin_id_fkey'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_created_by_admin_id_fkey"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
