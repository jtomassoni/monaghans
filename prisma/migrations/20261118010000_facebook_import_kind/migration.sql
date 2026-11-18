-- Broncos announcements are confirmed as football games, not food specials.
ALTER TABLE "FacebookFoodSpecialImport" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'food';
