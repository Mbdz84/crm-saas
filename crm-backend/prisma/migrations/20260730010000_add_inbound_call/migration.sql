-- Incoming dispatch-call recordings (see docs/incoming-call-log.md).
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

CREATE UNIQUE INDEX "InboundCall_callSid_key" ON "InboundCall"("callSid");
CREATE INDEX "InboundCall_companyId_occurredAt_idx" ON "InboundCall"("companyId", "occurredAt");
