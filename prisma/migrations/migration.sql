-- AlterTable: Add forcePasswordChange column to User table
ALTER TABLE "User" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
