-- CreateTable: Upload
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Asset
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Slide
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdCampaign
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdCreative
CREATE TABLE "AdCreative" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "destinationUrl" TEXT,
    "qrEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdvertiseLead
CREATE TABLE "AdvertiseLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "businessName" TEXT,
    "message" TEXT,
    "adType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertiseLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Upload createdByUserId
CREATE INDEX "Upload_createdByUserId_idx" ON "Upload"("createdByUserId");

-- CreateIndex: Upload createdAt
CREATE INDEX "Upload_createdAt_idx" ON "Upload"("createdAt");

-- CreateIndex: Asset uploadId
CREATE INDEX "Asset_uploadId_idx" ON "Asset"("uploadId");

-- CreateIndex: Slide type
CREATE INDEX "Slide_type_idx" ON "Slide"("type");

-- CreateIndex: Slide active
CREATE INDEX "Slide_active_idx" ON "Slide"("active");

-- CreateIndex: Slide orderIndex
CREATE INDEX "Slide_orderIndex_idx" ON "Slide"("orderIndex");

-- CreateIndex: Slide startAt
CREATE INDEX "Slide_startAt_idx" ON "Slide"("startAt");

-- CreateIndex: Slide endAt
CREATE INDEX "Slide_endAt_idx" ON "Slide"("endAt");

-- CreateIndex: AdCampaign tier
CREATE INDEX "AdCampaign_tier_idx" ON "AdCampaign"("tier");

-- CreateIndex: AdCampaign active
CREATE INDEX "AdCampaign_active_idx" ON "AdCampaign"("active");

-- CreateIndex: AdCampaign startAt
CREATE INDEX "AdCampaign_startAt_idx" ON "AdCampaign"("startAt");

-- CreateIndex: AdCampaign endAt
CREATE INDEX "AdCampaign_endAt_idx" ON "AdCampaign"("endAt");

-- CreateIndex: AdCreative campaignId
CREATE INDEX "AdCreative_campaignId_idx" ON "AdCreative"("campaignId");

-- CreateIndex: AdCreative assetId
CREATE INDEX "AdCreative_assetId_idx" ON "AdCreative"("assetId");

-- CreateIndex: AdCreative active
CREATE INDEX "AdCreative_active_idx" ON "AdCreative"("active");

-- CreateIndex: AdvertiseLead status
CREATE INDEX "AdvertiseLead_status_idx" ON "AdvertiseLead"("status");

-- CreateIndex: AdvertiseLead createdAt
CREATE INDEX "AdvertiseLead_createdAt_idx" ON "AdvertiseLead"("createdAt");

-- CreateIndex: AdvertiseLead email
CREATE INDEX "AdvertiseLead_email_idx" ON "AdvertiseLead"("email");

-- AddForeignKey: Upload createdByUserId -> User id
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Asset uploadId -> Upload id
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Slide assetId -> Asset id
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: AdCreative campaignId -> AdCampaign id
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: AdCreative assetId -> Asset id
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

