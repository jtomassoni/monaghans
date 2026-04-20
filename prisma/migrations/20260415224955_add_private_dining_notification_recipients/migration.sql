-- CreateTable
CREATE TABLE "PrivateDiningNotificationRecipient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateDiningNotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivateDiningNotificationRecipient_email_key" ON "PrivateDiningNotificationRecipient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateDiningNotificationRecipient_verificationToken_key" ON "PrivateDiningNotificationRecipient"("verificationToken");

-- CreateIndex
CREATE INDEX "PrivateDiningNotificationRecipient_verifiedAt_idx" ON "PrivateDiningNotificationRecipient"("verifiedAt");
