-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "timezone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "timezone" DROP NOT NULL,
ALTER COLUMN "timezone" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JobType" ALTER COLUMN "timezone" DROP NOT NULL,
ALTER COLUMN "timezone" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "timezone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "JobReminder" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "minutesBefore" INTEGER NOT NULL,
    "sendToTechnician" BOOLEAN NOT NULL DEFAULT true,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "canceled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobReminder_jobId_idx" ON "JobReminder"("jobId");

-- CreateIndex
CREATE INDEX "JobReminder_scheduledFor_idx" ON "JobReminder"("scheduledFor");

-- AddForeignKey
ALTER TABLE "JobReminder" ADD CONSTRAINT "JobReminder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
