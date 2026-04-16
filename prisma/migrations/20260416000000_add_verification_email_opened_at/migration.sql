-- AlterTable (IF NOT EXISTS avoids failure when the column was already added via db push or manual SQL)
ALTER TABLE "PrivateDiningNotificationRecipient" ADD COLUMN IF NOT EXISTS "verificationEmailOpenedAt" TIMESTAMP(3);
