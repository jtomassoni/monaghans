-- AlterTable
ALTER TABLE "PrivateDiningNotificationRecipient" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "PrivateDiningNotificationRecipient_active_idx" ON "PrivateDiningNotificationRecipient"("active");
