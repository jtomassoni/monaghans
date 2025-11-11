-- CreateTable: ShiftRequirement
CREATE TABLE "ShiftRequirement" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL,
    "cooks" INTEGER NOT NULL DEFAULT 0,
    "bartenders" INTEGER NOT NULL DEFAULT 0,
    "barbacks" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ShiftRequirement date
CREATE INDEX "ShiftRequirement_date_idx" ON "ShiftRequirement"("date");

-- CreateUniqueIndex: ShiftRequirement date shiftType
CREATE UNIQUE INDEX "ShiftRequirement_date_shiftType_key" ON "ShiftRequirement"("date", "shiftType");

-- CreateTable: WeeklyScheduleTemplate
CREATE TABLE "WeeklyScheduleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "shiftType" TEXT NOT NULL,
    "cooks" INTEGER NOT NULL DEFAULT 0,
    "bartenders" INTEGER NOT NULL DEFAULT 0,
    "barbacks" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: WeeklyScheduleTemplate dayOfWeek shiftType
CREATE INDEX "WeeklyScheduleTemplate_dayOfWeek_shiftType_idx" ON "WeeklyScheduleTemplate"("dayOfWeek", "shiftType");

-- CreateUniqueIndex: WeeklyScheduleTemplate dayOfWeek shiftType name
CREATE UNIQUE INDEX "WeeklyScheduleTemplate_dayOfWeek_shiftType_name_key" ON "WeeklyScheduleTemplate"("dayOfWeek", "shiftType", "name");

