-- CreateTable
CREATE TABLE "POSIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "credentials" TEXT NOT NULL,
    "config" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "syncFrequency" TEXT NOT NULL DEFAULT 'daily',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POSIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSSale" (
    "id" TEXT NOT NULL,
    "posIntegrationId" TEXT NOT NULL,
    "posTransactionId" TEXT NOT NULL,
    "posOrderNumber" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "customerCount" INTEGER,
    "serverName" TEXT,
    "locationId" TEXT,
    "rawData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POSSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSSaleItem" (
    "id" TEXT NOT NULL,
    "posSaleId" TEXT NOT NULL,
    "posItemId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modifiers" TEXT,
    "menuItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POSSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "POSIntegration_provider_idx" ON "POSIntegration"("provider");

-- CreateIndex
CREATE INDEX "POSIntegration_isActive_idx" ON "POSIntegration"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "POSSale_posIntegrationId_posTransactionId_key" ON "POSSale"("posIntegrationId", "posTransactionId");

-- CreateIndex
CREATE INDEX "POSSale_posIntegrationId_idx" ON "POSSale"("posIntegrationId");

-- CreateIndex
CREATE INDEX "POSSale_saleDate_idx" ON "POSSale"("saleDate");

-- CreateIndex
CREATE INDEX "POSSale_posOrderNumber_idx" ON "POSSale"("posOrderNumber");

-- CreateIndex
CREATE INDEX "POSSaleItem_posSaleId_idx" ON "POSSaleItem"("posSaleId");

-- CreateIndex
CREATE INDEX "POSSaleItem_menuItemId_idx" ON "POSSaleItem"("menuItemId");

-- CreateIndex
CREATE INDEX "POSSaleItem_name_idx" ON "POSSaleItem"("name");

-- AddForeignKey
ALTER TABLE "POSSale" ADD CONSTRAINT "POSSale_posIntegrationId_fkey" FOREIGN KEY ("posIntegrationId") REFERENCES "POSIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSaleItem" ADD CONSTRAINT "POSSaleItem_posSaleId_fkey" FOREIGN KEY ("posSaleId") REFERENCES "POSSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSaleItem" ADD CONSTRAINT "POSSaleItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

