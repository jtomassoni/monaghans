-- AlterTable
ALTER TABLE "Special" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'food',
ALTER COLUMN "appliesOn" DROP NOT NULL;
