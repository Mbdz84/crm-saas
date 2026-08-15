-- A technician's "Pending Close" saves the closing without finalizing it, so
-- JobClosing.closedAt must be nullable (it is only stamped when an admin
-- finalizes). Previously the NOT NULL constraint made every pending close fail.
ALTER TABLE "JobClosing" ALTER COLUMN "closedAt" DROP NOT NULL;
