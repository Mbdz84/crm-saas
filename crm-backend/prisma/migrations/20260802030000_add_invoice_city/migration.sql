ALTER TABLE "LeadSource" ADD COLUMN IF NOT EXISTS "invoiceCityStateZip" TEXT;
ALTER TABLE "Invoice"    ADD COLUMN IF NOT EXISTS "hdrCityStateZip"     TEXT;
