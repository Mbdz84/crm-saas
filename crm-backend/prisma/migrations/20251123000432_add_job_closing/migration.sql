-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "isClosingLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "JobClosing" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedByUserId" TEXT,
    "invoiceNumber" TEXT,
    "payments" JSONB NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "totalCcFee" DECIMAL(10,2) NOT NULL,
    "ccFeePercentAvg" DECIMAL(5,2),
    "techParts" DECIMAL(10,2) NOT NULL,
    "leadParts" DECIMAL(10,2) NOT NULL,
    "companyParts" DECIMAL(10,2) NOT NULL,
    "totalParts" DECIMAL(10,2) NOT NULL,
    "adjustedTotal" DECIMAL(10,2) NOT NULL,
    "techPercent" DECIMAL(5,2) NOT NULL,
    "leadPercent" DECIMAL(5,2) NOT NULL,
    "companyPercent" DECIMAL(5,2) NOT NULL,
    "excludeTechFromParts" BOOLEAN NOT NULL DEFAULT false,
    "techPaysAdditionalFee" BOOLEAN NOT NULL DEFAULT false,
    "leadAdditionalFee" DECIMAL(10,2) NOT NULL,
    "leadOwnedByCompany" BOOLEAN NOT NULL DEFAULT false,
    "techProfit" DECIMAL(10,2) NOT NULL,
    "leadProfit" DECIMAL(10,2) NOT NULL,
    "companyProfitBase" DECIMAL(10,2) NOT NULL,
    "companyProfitDisplay" DECIMAL(10,2) NOT NULL,
    "techBalance" DECIMAL(10,2) NOT NULL,
    "leadBalance" DECIMAL(10,2) NOT NULL,
    "companyBalance" DECIMAL(10,2) NOT NULL,
    "sumCheck" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobClosing_jobId_key" ON "JobClosing"("jobId");

-- AddForeignKey
ALTER TABLE "JobClosing" ADD CONSTRAINT "JobClosing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClosing" ADD CONSTRAINT "JobClosing_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
