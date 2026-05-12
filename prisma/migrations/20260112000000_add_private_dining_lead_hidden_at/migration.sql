-- Soft-delete for private dining leads (owner "delete" hides; admin can restore)
ALTER TABLE "PrivateDiningLead" ADD COLUMN "hiddenAt" TIMESTAMP(3);

CREATE INDEX "PrivateDiningLead_hiddenAt_idx" ON "PrivateDiningLead"("hiddenAt");
