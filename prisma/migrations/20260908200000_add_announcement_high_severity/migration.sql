-- AlterTable: Add high-severity (modal) display flag to Announcement
ALTER TABLE "Announcement" ADD COLUMN "isHighSeverity" BOOLEAN NOT NULL DEFAULT false;
