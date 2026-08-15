-- Add "isOwner" flags used to compute owner-based Company Profit in reports.
ALTER TABLE "User" ADD COLUMN "isOwner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LeadSource" ADD COLUMN "isOwner" BOOLEAN NOT NULL DEFAULT false;
