-- Settlement / payment-history tables. Safe/idempotent.

CREATE TABLE IF NOT EXISTS "Settlement" (
  "id"          TEXT PRIMARY KEY,
  "companyId"   TEXT NOT NULL,
  "partyType"   TEXT NOT NULL,
  "partyId"     TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd"   TIMESTAMP(3) NOT NULL,
  "amount"      DECIMAL(10,2) NOT NULL,
  "note"        TEXT,
  "manual"      BOOLEAN NOT NULL DEFAULT false,
  "paid"        BOOLEAN NOT NULL DEFAULT false,
  "paidAt"      TIMESTAMP(3),
  "settledById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Settlement_companyId_partyType_partyId_idx"
  ON "Settlement" ("companyId", "partyType", "partyId");

CREATE TABLE IF NOT EXISTS "JobPartySettlement" (
  "id"           TEXT PRIMARY KEY,
  "companyId"    TEXT NOT NULL,
  "jobId"        TEXT NOT NULL,
  "partyType"    TEXT NOT NULL,
  "partyId"      TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "amount"       DECIMAL(10,2) NOT NULL,
  "settledAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobPartySettlement_settlementId_fkey"
    FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobPartySettlement_jobId_partyType_key"
  ON "JobPartySettlement" ("jobId", "partyType");
CREATE INDEX IF NOT EXISTS "JobPartySettlement_companyId_partyType_partyId_idx"
  ON "JobPartySettlement" ("companyId", "partyType", "partyId");
