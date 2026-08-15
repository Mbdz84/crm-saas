-- AlterTable
ALTER TABLE "JobClosing" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "canceledReason" TEXT;
