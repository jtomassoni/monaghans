-- Optional user a private-dining alert email signs in as.
ALTER TABLE "PrivateDiningNotificationRecipient" ADD COLUMN "userId" TEXT;

CREATE INDEX "PrivateDiningNotificationRecipient_userId_idx" ON "PrivateDiningNotificationRecipient"("userId");

ALTER TABLE "PrivateDiningNotificationRecipient" ADD CONSTRAINT "PrivateDiningNotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
