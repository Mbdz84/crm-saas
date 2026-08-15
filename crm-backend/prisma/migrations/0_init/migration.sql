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
    "notifyTechOnJobCreate" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "invoiceDescriptions" TEXT[] DEFAULT ARRAY[]::TEXT[],

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
    "maskedTwilioNumberSid" TEXT,
    "maskedTwilioPhoneNumber" TEXT,
    "maskedCalls" BOOLEAN NOT NULL DEFAULT false,
    "receiveSms" BOOLEAN DEFAULT true,
    "payrollEnabled" BOOLEAN NOT NULL DEFAULT false,
    "canSeeClosing" BOOLEAN NOT NULL DEFAULT true,
    "canSeeTotals" BOOLEAN NOT NULL DEFAULT true,
    "canViewAllJobs" BOOLEAN NOT NULL DEFAULT true,
    "defaultTechPercent" DECIMAL(5,2),
    "defaultPartsResponsibility" TEXT,
    "defaultTechPaysExtraFee" BOOLEAN NOT NULL DEFAULT false,
    "defaultCcFeePercent" DECIMAL(5,2),
    "defaultCheckFeePercent" DECIMAL(5,2),
    "canAdjustPercentages" BOOLEAN NOT NULL DEFAULT false,
    "canAdjustParts" BOOLEAN NOT NULL DEFAULT false,
    "canAdjustFees" BOOLEAN NOT NULL DEFAULT false,
    "availability" JSON,
    "timezone" TEXT DEFAULT 'America/Chicago',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "canLogin" BOOLEAN NOT NULL DEFAULT true,
    "canSeeClientPhone" BOOLEAN NOT NULL DEFAULT true,
    "canSeeLogs" BOOLEAN NOT NULL DEFAULT true,
    "canSeeRecordings" BOOLEAN NOT NULL DEFAULT true,
    "canUseCalendar" BOOLEAN NOT NULL DEFAULT true,
    "canSeeReports" BOOLEAN NOT NULL DEFAULT true,
    "canSeeLeadSource" BOOLEAN NOT NULL DEFAULT true,
    "canSeeTechnicianField" BOOLEAN NOT NULL DEFAULT true,
    "canChangeJobType" BOOLEAN NOT NULL DEFAULT true,
    "canEditCustomerInfo" BOOLEAN NOT NULL DEFAULT true,
    "canRefreshExtension" BOOLEAN NOT NULL DEFAULT true,
    "canDeleteJob" BOOLEAN NOT NULL DEFAULT true,
    "canDuplicateJob" BOOLEAN NOT NULL DEFAULT true,
    "canEditCustomerName" BOOLEAN NOT NULL DEFAULT true,
    "canEditCustomerAddress" BOOLEAN NOT NULL DEFAULT true,
    "canEditDescription" BOOLEAN NOT NULL DEFAULT true,
    "canEditStatus" BOOLEAN NOT NULL DEFAULT true,
    "canSeeCallerId" BOOLEAN NOT NULL DEFAULT true,
    "canSeePhoneHistory" BOOLEAN NOT NULL DEFAULT true,
    "canSeeDashboard" BOOLEAN NOT NULL DEFAULT true,
    "canUseChat" BOOLEAN NOT NULL DEFAULT true,
    "canSeeSearch" BOOLEAN NOT NULL DEFAULT true,
    "canCreateJob" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',

    CONSTRAINT "JobType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultLeadPercent" DECIMAL(5,2),
    "defaultAdditionalFee" DECIMAL(10,2),
    "defaultCcFeePercent" DECIMAL(5,2),
    "defaultCheckFeePercent" DECIMAL(5,2),
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "autoApplyFinancialRules" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyHash" TEXT,
    "apiKeyLast4" TEXT,
    "apiKeyCreatedAt" TIMESTAMPTZ(6),
    "incomingSmsNumbers" TEXT[],
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "invoiceCompanyName" TEXT,
    "invoicePhone" TEXT,
    "invoiceAddress" TEXT,
    "invoiceCityStateZip" TEXT,
    "invoiceLogoUrl" TEXT,
    "invoiceLicense" TEXT,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT,
    "leadSourceId" TEXT,
    "number" TEXT NOT NULL,
    "shortId" TEXT,
    "customerName" TEXT,
    "customerAddress" TEXT,
    "location" TEXT,
    "resPhone" TEXT,
    "busPhone" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "totalMaterials" DECIMAL(10,2),
    "totalLabor" DECIMAL(10,2),
    "serviceCharge" DECIMAL(10,2),
    "tripCharge" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2),
    "tax" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "serviceChargeOn" BOOLEAN NOT NULL DEFAULT false,
    "tripChargeOn" BOOLEAN NOT NULL DEFAULT false,
    "showAuth" BOOLEAN NOT NULL DEFAULT true,
    "showTerms" BOOLEAN NOT NULL DEFAULT true,
    "size" TEXT NOT NULL DEFAULT 'a4',
    "notes" TEXT,
    "hdrCompanyName" TEXT,
    "hdrPhone" TEXT,
    "hdrAddress" TEXT,
    "hdrCityStateZip" TEXT,
    "hdrLogoUrl" TEXT,
    "hdrLicense" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
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
    "customerPhone2" TEXT,
    "canceledAt" TIMESTAMP(3),
    "canceledReason" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobClosing" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
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
    "companyId" TEXT NOT NULL,
    "technicianId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "clientPhoneType" TEXT,
    "extension" TEXT NOT NULL,
    "lastCallerPhone" TEXT,
    "lastInboundCallSid" TEXT,
    "lastOutboundCallSid" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCallSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "recordingSid" TEXT,
    "from" TEXT,
    "to" TEXT,
    "url" TEXT,
    "parentCallSid" TEXT,
    "duration" INTEGER,
    "status" TEXT,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReminder" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "job_id" TEXT NOT NULL,
    "minutes_before" INTEGER NOT NULL,
    "send_to_technician" BOOLEAN DEFAULT true,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "canceled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "JobReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsConversation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientNumber" TEXT NOT NULL,
    "crmNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "displayName" TEXT,
    "box" TEXT NOT NULL DEFAULT 'inbox',
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "unread" INTEGER NOT NULL DEFAULT 0,
    "lastMessageText" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallerId" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallerId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrls" TEXT[],
    "twilioSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundCall" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadSourceId" TEXT,
    "leadSourceName" TEXT,
    "callSid" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "settledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPartySettlement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPartySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JobType_name_companyId_key" ON "JobType"("name", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_apiKeyHash_key" ON "LeadSource"("apiKeyHash");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE INDEX "Invoice_jobId_idx" ON "Invoice"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_number_key" ON "Invoice"("companyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Job_shortId_key" ON "Job"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "JobClosing_jobId_key" ON "JobClosing"("jobId");

-- CreateIndex
CREATE INDEX "JobCallSession_jobId_idx" ON "JobCallSession"("jobId");

-- CreateIndex
CREATE INDEX "JobCallSession_customerPhone_idx" ON "JobCallSession"("customerPhone");

-- CreateIndex
CREATE INDEX "JobCallSession_companyId_extension_idx" ON "JobCallSession"("companyId", "extension");

-- CreateIndex
CREATE INDEX "JobCallSession_technicianId_idx" ON "JobCallSession"("technicianId");

-- CreateIndex
CREATE INDEX "job_reminder_job_id_idx" ON "JobReminder"("job_id");

-- CreateIndex
CREATE INDEX "job_reminder_scheduled_for_idx" ON "JobReminder"("scheduled_for");

-- CreateIndex
CREATE INDEX "SmsConversation_companyId_box_lastMessageAt_idx" ON "SmsConversation"("companyId", "box", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsConversation_companyId_clientNumber_crmNumber_key" ON "SmsConversation"("companyId", "clientNumber", "crmNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CallerId_companyId_number_key" ON "CallerId"("companyId", "number");

-- CreateIndex
CREATE INDEX "SmsMessage_conversationId_createdAt_idx" ON "SmsMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InboundCall_callSid_key" ON "InboundCall"("callSid");

-- CreateIndex
CREATE INDEX "InboundCall_companyId_occurredAt_idx" ON "InboundCall"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "Settlement_companyId_partyType_partyId_idx" ON "Settlement"("companyId", "partyType", "partyId");

-- CreateIndex
CREATE INDEX "JobPartySettlement_companyId_partyType_partyId_idx" ON "JobPartySettlement"("companyId", "partyType", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "JobPartySettlement_jobId_partyType_key" ON "JobPartySettlement"("jobId", "partyType");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobType" ADD CONSTRAINT "JobType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSource" ADD CONSTRAINT "LeadSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "JobStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClosing" ADD CONSTRAINT "JobClosing_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobClosing" ADD CONSTRAINT "JobClosing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLog" ADD CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLog" ADD CONSTRAINT "JobLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCallSession" ADD CONSTRAINT "JobCallSession_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecord" ADD CONSTRAINT "JobRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReminder" ADD CONSTRAINT "JobReminder_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SmsConversation" ADD CONSTRAINT "SmsConversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallerId" ADD CONSTRAINT "CallerId_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SmsConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPartySettlement" ADD CONSTRAINT "JobPartySettlement_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

