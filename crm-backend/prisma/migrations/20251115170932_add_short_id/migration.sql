/*
  Warnings:

  - A unique constraint covering the columns `[shortId]` on the table `Job` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shortId` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- Add shortId column (initially nullable)
ALTER TABLE "Job"
ADD COLUMN "shortId" TEXT;

-- Backfill all existing jobs with a generated 5-char code
UPDATE "Job"
SET "shortId" = UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 5))
WHERE "shortId" IS NULL;

-- Make the field required
ALTER TABLE "Job"
ALTER COLUMN "shortId" SET NOT NULL;

-- Ensure unique values (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'Job_shortId_key'
    ) THEN
        ALTER TABLE "Job"
        ADD CONSTRAINT "Job_shortId_key" UNIQUE ("shortId");
    END IF;
END$$;