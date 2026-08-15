/*
  Warnings:

  - You are about to drop the column `canceledAt` on the `JobClosing` table. All the data in the column will be lost.
  - You are about to drop the column `canceledReason` on the `JobClosing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "canceledReason" TEXT;

-- AlterTable
ALTER TABLE "JobClosing" DROP COLUMN "canceledAt",
DROP COLUMN "canceledReason";
