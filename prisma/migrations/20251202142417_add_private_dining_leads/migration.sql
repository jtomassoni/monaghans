-- Add private dining leads migration
-- Creates PrivateDiningLead, LeadNote, and LeadContact tables for CRM functionality

-- CreateTable: PrivateDiningLead
CREATE TABLE "PrivateDiningLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "groupSize" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateDiningLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LeadNote
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LeadContact
CREATE TABLE "LeadContact" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PrivateDiningLead eventId (unique)
CREATE UNIQUE INDEX "PrivateDiningLead_eventId_key" ON "PrivateDiningLead"("eventId");

-- CreateIndex: PrivateDiningLead status
CREATE INDEX "PrivateDiningLead_status_idx" ON "PrivateDiningLead"("status");

-- CreateIndex: PrivateDiningLead preferredDate
CREATE INDEX "PrivateDiningLead_preferredDate_idx" ON "PrivateDiningLead"("preferredDate");

-- CreateIndex: PrivateDiningLead createdAt
CREATE INDEX "PrivateDiningLead_createdAt_idx" ON "PrivateDiningLead"("createdAt");

-- CreateIndex: PrivateDiningLead email
CREATE INDEX "PrivateDiningLead_email_idx" ON "PrivateDiningLead"("email");

-- CreateIndex: LeadNote leadId
CREATE INDEX "LeadNote_leadId_idx" ON "LeadNote"("leadId");

-- CreateIndex: LeadNote createdAt
CREATE INDEX "LeadNote_createdAt_idx" ON "LeadNote"("createdAt");

-- CreateIndex: LeadContact leadId
CREATE INDEX "LeadContact_leadId_idx" ON "LeadContact"("leadId");

-- AddForeignKey: PrivateDiningLead eventId -> Event id
ALTER TABLE "PrivateDiningLead" ADD CONSTRAINT "PrivateDiningLead_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LeadNote leadId -> PrivateDiningLead id
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PrivateDiningLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeadContact leadId -> PrivateDiningLead id
ALTER TABLE "LeadContact" ADD CONSTRAINT "LeadContact_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PrivateDiningLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

