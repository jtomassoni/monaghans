-- CreateTable
CREATE TABLE "PrivateDiningLeadAcknowledgment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateDiningLeadAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivateDiningLeadAcknowledgment_userId_leadId_key" ON "PrivateDiningLeadAcknowledgment"("userId", "leadId");

-- CreateIndex
CREATE INDEX "PrivateDiningLeadAcknowledgment_userId_idx" ON "PrivateDiningLeadAcknowledgment"("userId");

-- CreateIndex
CREATE INDEX "PrivateDiningLeadAcknowledgment_leadId_idx" ON "PrivateDiningLeadAcknowledgment"("leadId");

-- AddForeignKey
ALTER TABLE "PrivateDiningLeadAcknowledgment" ADD CONSTRAINT "PrivateDiningLeadAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateDiningLeadAcknowledgment" ADD CONSTRAINT "PrivateDiningLeadAcknowledgment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PrivateDiningLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
