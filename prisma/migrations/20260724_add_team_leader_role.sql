-- Phase 1: Add TEAM_LEAD role, Team model, teamLeaderId on User, TeamTarget

-- 1. Add TEAM_LEAD to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEAM_LEAD';

-- 2. Add teamLeaderId to User (nullable self-reference)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teamLeaderId" TEXT;
CREATE INDEX IF NOT EXISTS idx_user_team_leader ON "User" ("teamLeaderId");

-- 3. Create Team table
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Team_leaderId_key" UNIQUE ("leaderId")
);

CREATE INDEX IF NOT EXISTS idx_team_leader ON "Team" ("leaderId");

-- 4. Create TeamTarget table
CREATE TABLE IF NOT EXISTS "TeamTarget" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "target" INTEGER NOT NULL,
    "achieved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeamTarget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeamTarget_teamId_month_year_key" UNIQUE ("teamId", "month", "year")
);

CREATE INDEX IF NOT EXISTS idx_team_target_team ON "TeamTarget" ("teamId");

-- 5. Add foreign key constraints
ALTER TABLE "User" ADD CONSTRAINT "User_teamLeaderId_fkey"
    FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey"
    FOREIGN KEY ("leaderId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamTarget" ADD CONSTRAINT "TeamTarget_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Add Team Leader settings to CRMSetting
ALTER TABLE "CRMSetting" ADD COLUMN IF NOT EXISTS "tlTeamLeadsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CRMSetting" ADD COLUMN IF NOT EXISTS "tlDistributeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CRMSetting" ADD COLUMN IF NOT EXISTS "tlMaxTeamSize" INTEGER NOT NULL DEFAULT 10;