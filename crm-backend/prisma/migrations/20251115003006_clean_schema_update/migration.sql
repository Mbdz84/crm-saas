/*
  Warnings:

  - You are about to drop the column `notifyTechOnJobCreate` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `JobType` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `JobType` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `JobType` table. All the data in the column will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_customerId_fkey";

-- DropIndex
DROP INDEX "JobType_name_companyId_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "notifyTechOnJobCreate";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "customerId",
ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'Accepted';

-- AlterTable
ALTER TABLE "JobType" DROP COLUMN "active",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "Customer";

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeadSource" ADD CONSTRAINT "LeadSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
