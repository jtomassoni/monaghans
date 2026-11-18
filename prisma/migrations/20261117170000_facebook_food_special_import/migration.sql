-- Food specials parsed from the bar's Facebook page, waiting for a one-click confirm.
CREATE TABLE "FacebookFoodSpecialImport" (
    "id" TEXT NOT NULL,
    "facebookPostId" TEXT NOT NULL,
    "permalink" TEXT,
    "imageUrl" TEXT,
    "rawMessage" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceNotes" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "specialId" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookFoodSpecialImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookFoodSpecialImport_facebookPostId_key" ON "FacebookFoodSpecialImport"("facebookPostId");
CREATE INDEX "FacebookFoodSpecialImport_status_idx" ON "FacebookFoodSpecialImport"("status");
