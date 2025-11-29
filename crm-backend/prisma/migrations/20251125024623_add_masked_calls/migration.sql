-- AlterTable
ALTER TABLE "JobLog" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "maskedCalls" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "JobCallSession" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCallSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobCallSession_jobId_idx" ON "JobCallSession"("jobId");

-- CreateIndex
CREATE INDEX "JobCallSession_technicianId_idx" ON "JobCallSession"("technicianId");

-- CreateIndex
CREATE INDEX "JobCallSession_customerPhone_idx" ON "JobCallSession"("customerPhone");

-- CreateIndex
CREATE INDEX "JobCallSession_companyId_extension_idx" ON "JobCallSession"("companyId", "extension");

-- AddForeignKey
ALTER TABLE "JobLog" ADD CONSTRAINT "JobLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
