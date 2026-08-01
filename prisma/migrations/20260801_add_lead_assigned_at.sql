-- Add assignedAt to track when a lead was last assigned to a user.
ALTER TABLE "Lead" ADD COLUMN "assignedAt" TIMESTAMP(3);

-- Backfill: use updatedAt as an approximation of assignment time for
-- leads that are currently assigned but were assigned before this column existed.
UPDATE "Lead" SET "assignedAt" = "updatedAt"
WHERE "assignedToId" IS NOT NULL AND "assignedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Lead_assignedAt_idx" ON "Lead"("assignedAt");
