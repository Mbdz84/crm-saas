-- Company: shared invoice description presets
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "invoiceDescriptions" TEXT[] NOT NULL DEFAULT '{}';

-- LeadSource: per-brand invoice identity (printed on the invoice header)
ALTER TABLE "LeadSource" ADD COLUMN IF NOT EXISTS "invoiceCompanyName" TEXT;
ALTER TABLE "LeadSource" ADD COLUMN IF NOT EXISTS "invoicePhone"       TEXT;
ALTER TABLE "LeadSource" ADD COLUMN IF NOT EXISTS "invoiceAddress"     TEXT;
ALTER TABLE "LeadSource" ADD COLUMN IF NOT EXISTS "invoiceLogoUrl"     TEXT;
ALTER TABLE "LeadSource" ADD COLUMN IF NOT EXISTS "invoiceLicense"     TEXT;

-- Invoice table
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id"              TEXT NOT NULL,
  "companyId"       TEXT NOT NULL,
  "jobId"           TEXT,
  "leadSourceId"    TEXT,
  "number"          TEXT NOT NULL,
  "shortId"         TEXT,
  "customerName"    TEXT,
  "customerAddress" TEXT,
  "location"        TEXT,
  "resPhone"        TEXT,
  "busPhone"        TEXT,
  "invoiceDate"     TIMESTAMP(3),
  "lineItems"       JSONB NOT NULL DEFAULT '[]',
  "totalMaterials"  DECIMAL(10,2),
  "totalLabor"      DECIMAL(10,2),
  "serviceCharge"   DECIMAL(10,2),
  "tripCharge"      DECIMAL(10,2),
  "subtotal"        DECIMAL(10,2),
  "tax"             DECIMAL(10,2),
  "total"           DECIMAL(10,2),
  "serviceChargeOn" BOOLEAN NOT NULL DEFAULT false,
  "tripChargeOn"    BOOLEAN NOT NULL DEFAULT false,
  "size"            TEXT NOT NULL DEFAULT 'a4',
  "notes"           TEXT,
  "hdrCompanyName"  TEXT,
  "hdrPhone"        TEXT,
  "hdrAddress"      TEXT,
  "hdrLogoUrl"      TEXT,
  "hdrLicense"      TEXT,
  "createdById"     TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_companyId_number_key" ON "Invoice"("companyId", "number");
CREATE INDEX IF NOT EXISTS "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX IF NOT EXISTS "Invoice_jobId_idx" ON "Invoice"("jobId");
