-- AlterTable: Add deletedAt to Employee
ALTER TABLE "Employee" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex: Employee deletedAt
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");

