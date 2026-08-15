-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availability" JSONB,
ADD COLUMN     "canAdjustFees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAdjustParts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canAdjustPercentages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canSeeClosing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewAllJobs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultCcFeePercent" DECIMAL(5,2),
ADD COLUMN     "defaultCheckFeePercent" DECIMAL(5,2),
ADD COLUMN     "defaultPartsResponsibility" TEXT,
ADD COLUMN     "defaultTechPaysExtraFee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultTechPercent" DECIMAL(5,2),
ADD COLUMN     "payrollEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiveSms" BOOLEAN NOT NULL DEFAULT true;
