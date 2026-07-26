-- Add chatType enum and column to GroupMessage
DO $$ BEGIN
  CREATE TYPE "GroupChatType" AS ENUM ('GENERAL', 'TL_TEAM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "GroupMessage" ADD COLUMN IF NOT EXISTS "chatType" "GroupChatType" NOT NULL DEFAULT 'GENERAL';

-- Migrate existing messages: TLs and assigned salespersons → TL_TEAM
UPDATE "GroupMessage" SET "chatType" = 'TL_TEAM'
WHERE "senderId" IN (
  SELECT id FROM "User" WHERE role = 'TEAM_LEAD'
  UNION
  SELECT id FROM "User" WHERE "teamLeaderId" IS NOT NULL AND role = 'SALESPERSON'
);
