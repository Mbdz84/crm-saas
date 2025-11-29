/*
  Warnings:

  - Made the column `recordingSid` on table `JobRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "JobRecord" ALTER COLUMN "recordingSid" SET NOT NULL;
