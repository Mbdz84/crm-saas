-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';

-- AlterTable
ALTER TABLE "JobType" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';
