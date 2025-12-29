-- AlterTable: Add dismissable field to Announcement
ALTER TABLE "Announcement" ADD COLUMN "dismissable" BOOLEAN NOT NULL DEFAULT true;


