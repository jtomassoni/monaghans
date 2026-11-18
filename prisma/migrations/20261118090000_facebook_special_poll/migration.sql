-- History of each hourly Facebook specials check.
CREATE TABLE "FacebookSpecialPoll" (
    "id" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "summary" TEXT NOT NULL,
    "checked" INTEGER NOT NULL DEFAULT 0,
    "emailed" INTEGER NOT NULL DEFAULT 0,
    "results" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookSpecialPoll_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FacebookSpecialPoll_ranAt_idx" ON "FacebookSpecialPoll"("ranAt");
