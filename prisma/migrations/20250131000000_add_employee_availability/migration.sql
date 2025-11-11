-- CreateTable: EmployeeAvailability
CREATE TABLE "EmployeeAvailability" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: EmployeeAvailability employeeId
CREATE INDEX "EmployeeAvailability_employeeId_idx" ON "EmployeeAvailability"("employeeId");

-- CreateIndex: EmployeeAvailability date
CREATE INDEX "EmployeeAvailability_date_idx" ON "EmployeeAvailability"("date");

-- CreateUniqueIndex: EmployeeAvailability employeeId date shiftType
CREATE UNIQUE INDEX "EmployeeAvailability_employeeId_date_shiftType_key" ON "EmployeeAvailability"("employeeId", "date", "shiftType");

-- AddForeignKey
ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

