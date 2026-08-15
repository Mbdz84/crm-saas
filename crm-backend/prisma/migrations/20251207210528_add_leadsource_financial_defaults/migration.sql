-- AlterTable
ALTER TABLE "LeadSource" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoApplyFinancialRules" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#6b7280',
ADD COLUMN     "defaultAdditionalFee" DECIMAL(10,2),
ADD COLUMN     "defaultCcFeePercent" DECIMAL(5,2),
ADD COLUMN     "defaultCheckFeePercent" DECIMAL(5,2),
ADD COLUMN     "defaultLeadPercent" DECIMAL(5,2),
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;
