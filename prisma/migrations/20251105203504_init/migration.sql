-- Init migration
-- Most tables (Special, Event, Announcement, Setting, PostQueue, User) are now created in the baseline migration
-- This migration only creates the Page table which is not in the baseline

-- CreateTable: Page
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Page slug
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
