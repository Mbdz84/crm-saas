/*
  Warnings:

  - Made the column `updatedAt` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- Fix NULL updatedAt values
UPDATE "Job" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

-- Add active column to JobType
ALTER TABLE "JobType" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- Now make updatedAt required
ALTER TABLE "Job" ALTER COLUMN "updatedAt" SET NOT NULL;