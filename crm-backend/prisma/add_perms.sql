-- Adds the 3 new technician permission columns.
-- Idempotent (IF NOT EXISTS) so it's safe to run on both local and Supabase.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "canEditDescription" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "canEditStatus"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "canSeeCallerId"     BOOLEAN NOT NULL DEFAULT true;
