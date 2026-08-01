-- Wiring the "Active User (can log in)" switch.
-- Run this BEFORE deploying the login-enforcement code, on BOTH local and Supabase.

-- 1) Nobody currently loses access: everyone who can log in today still can.
--    (Admins can turn specific technicians off afterwards.)
UPDATE "User" SET "canLogin" = true WHERE "canLogin" = false;

-- 2) New users default to allowed (admin explicitly disables to block).
ALTER TABLE "User" ALTER COLUMN "canLogin" SET DEFAULT true;
