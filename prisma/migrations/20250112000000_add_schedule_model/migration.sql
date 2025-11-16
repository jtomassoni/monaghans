-- CreateTable: Schedule
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Schedule employeeId
CREATE INDEX "Schedule_employeeId_idx" ON "Schedule"("employeeId");

-- CreateIndex: Schedule date
CREATE INDEX "Schedule_date_idx" ON "Schedule"("date");

-- CreateUniqueIndex: Schedule employeeId date shiftType
CREATE UNIQUE INDEX "Schedule_employeeId_date_shiftType_key" ON "Schedule"("employeeId", "date", "shiftType");

-- AddForeignKey: Schedule employeeId -> Employee id
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

