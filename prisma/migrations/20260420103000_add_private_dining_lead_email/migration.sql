-- CreateTable
CREATE TABLE "public"."PrivateDiningLeadEmail" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateDiningLeadEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateDiningLeadEmail_leadId_createdAt_idx" ON "public"."PrivateDiningLeadEmail"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."PrivateDiningLeadEmail" ADD CONSTRAINT "PrivateDiningLeadEmail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."PrivateDiningLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
