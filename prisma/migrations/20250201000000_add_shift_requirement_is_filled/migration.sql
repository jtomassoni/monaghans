-- AlterTable: Add isFilled field to ShiftRequirement
ALTER TABLE "ShiftRequirement" ADD COLUMN "isFilled" BOOLEAN NOT NULL DEFAULT false;

