-- AlterTable: Add expiresAt, ctaText, and ctaUrl to Announcement
ALTER TABLE "Announcement" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Announcement" ADD COLUMN "ctaText" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "ctaUrl" TEXT;

