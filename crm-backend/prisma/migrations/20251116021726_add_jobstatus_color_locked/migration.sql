-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "smsSettings" JSONB;

-- AlterTable
ALTER TABLE "JobStatus" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#6b7280',
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;
