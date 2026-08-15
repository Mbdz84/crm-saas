-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "smsSettings" JSONB,
    "timezone" TEXT DEFAULT 'America/Chicago',

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "maskedCalls" BOOLEAN NOT NULL DEFAULT false,
    "receiveSms" BOOLEAN NOT NULL DEFAULT true,
    "payrollEnabled" BOOLEAN NOT NULL DEFAULT false,
    "canSeeClosing" BOOLEAN NOT NULL DEFAULT true,
    "canViewAllJobs" BOOLEAN NOT NULL DEFAULT true,
    "defaultTechPercent" DECIMAL(5,2),
    "defaultPartsResponsibility" TEXT,
    "defaultTechPaysExtraFee" BOOLEAN NOT NULL DEFAULT false,
    "defaultCcFeePercent" DECIMAL(5,2),
    "defaultCheckFeePercent" DECIMAL(5,2),
    "canAdjustPercentages" BOOLEAN NOT NULL DEFAULT false,
    "canAdjustParts" BOOLEAN NOT NULL DEFAULT false,
    "canAdjustFees" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT DEFAULT 'America/Chicago',
    "availability" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "JobType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "incomingSmsNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companyId" TEXT NOT NULL,
    "apiKeyHash" TEXT,
    "apiKeyLast4" TEXT,
    "apiKeyCreatedAt" TIMESTAMP(3),
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "defaultLeadPercent" DECIMAL(5,2),
    "defaultAdditionalFee" DECIMAL(10,2),
    "defaultCcFeePercent" DECIMAL(5,2),
    "defaultCheckFeePercent" DECIMAL(5,2),
    "autoApplyFinancialRules" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerPhone2" TEXT,
    "customerAddress" TEXT,
    "jobTypeId" TEXT,
    "technicianId" TEXT,
    "sourceId" TEXT,
    "statusId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Accepted',
    "scheduledAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "isClosingLocked" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "canceledReason" TEXT,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

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
    "cashTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creditTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "checkTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "zelleTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "userId" TEXT,
    "jobId" TEXT NOT NULL,

    CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JobStatus_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "JobRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "recordingSid" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "url" TEXT NOT NULL,
    "parentCallSid" TEXT,
    "duration" INTEGER,
    "status" TEXT,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReminder" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "minutes_before" INTEGER NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "send_to_technician" BOOLEAN NOT NULL DEFAULT true,
    "sent_at" TIMESTAMP(3),
    "canceled" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_apiKeyHash_key" ON "LeadSource"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Job_shortId_key" ON "Job"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "JobClosing_jobId_key" ON "JobClosing"("jobId");

-- CreateIndex
CREATE INDEX "JobCallSession_jobId_idx" ON "JobCallSession"("jobId");

-- CreateIndex
CREATE INDEX "JobCallSession_technicianId_idx" ON "JobCallSession"("technicianId");

-- CreateIndex
CREATE INDEX "JobCallSession_customerPhone_idx" ON "JobCallSession"("customerPhone");

-- CreateIndex
CREATE INDEX "JobCallSession_companyId_extension_idx" ON "JobCallSession"("companyId", "extension");

-- CreateIndex
CREATE INDEX "JobReminder_job_id_idx" ON "JobReminder"("job_id");

-- CreateIndex
CREATE INDEX "JobReminder_scheduled_for_idx" ON "JobReminder"("scheduled_for");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobType" ADD CONSTRAINT "JobType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSource" ADD CONSTRAINT "LeadSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "JobStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClosing" ADD CONSTRAINT "JobClosing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClosing" ADD CONSTRAINT "JobClosing_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLog" ADD CONSTRAINT "JobLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLog" ADD CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecord" ADD CONSTRAINT "JobRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReminder" ADD CONSTRAINT "JobReminder_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

