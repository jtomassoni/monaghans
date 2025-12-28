-- IMMEDIATE FIX FOR PRODUCTION
-- Run this SQL directly in your production database to fix the 500 error

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "dismissable" BOOLEAN NOT NULL DEFAULT true;

