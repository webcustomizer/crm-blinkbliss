ALTER TABLE "GroupMessage" ADD COLUMN IF NOT EXISTS "teamLeaderId" TEXT;
CREATE INDEX IF NOT EXISTS "GroupMessage_chatType_teamLeaderId_idx" ON "GroupMessage"("chatType", "teamLeaderId");
