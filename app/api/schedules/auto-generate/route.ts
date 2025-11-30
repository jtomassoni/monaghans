import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { calculateShiftTimes, type ShiftType, type EmployeeRole } from '@/lib/schedule-helpers';
import { getMountainTimeDateString, parseMountainTimeDate } from '@/lib/timezone';

/**
 * Auto-generate schedules based on shift requirements
 * POST: Generate schedules for a date range
 */
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { startDate, endDate, templateName, overwriteExisting } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Parse dates as Mountain Time
    const start = parseMountainTimeDate(startDate);
    const end = parseMountainTimeDate(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Get all active employees grouped by role
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });

    const employeesByRole: Record<string, typeof employees> = {
      cook: employees.filter(e => e.role === 'cook'),
      bartender: employees.filter(e => e.role === 'bartender'),
      barback: employees.filter(e => e.role === 'barback'),
    };

    // Get specific requirements for the date range
    const specificRequirements = await prisma.shiftRequirement.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get weekly template (use active template or specified template)
    const templateFilter: any = { isActive: true };
    if (templateName) {
      templateFilter.name = templateName;
    }
    const weeklyTemplates = await prisma.weeklyScheduleTemplate.findMany({
      where: templateFilter,
      orderBy: [
        { name: 'asc' },
        { dayOfWeek: 'asc' },
        { shiftType: 'asc' },
      ],
    });

    // Get existing schedules for the date range
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // Build a map of existing schedules by date and shift type
    const existingByDateAndShift: Record<string, Record<string, string[]>> = {};
    existingSchedules.forEach(schedule => {
      const dateStr = getMountainTimeDateString(schedule.date);
      if (!existingByDateAndShift[dateStr]) {
        existingByDateAndShift[dateStr] = {};
      }
      if (!existingByDateAndShift[dateStr][schedule.shiftType]) {
        existingByDateAndShift[dateStr][schedule.shiftType] = [];
      }
      existingByDateAndShift[dateStr][schedule.shiftType].push(schedule.employeeId);
    });

    // Get availability entries for the date range
    const availabilityEntries = await prisma.employeeAvailability.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // Build availability map: employeeId -> date -> shiftType -> isAvailable
    const availabilityMap: Record<string, Record<string, Record<string, boolean>>> = {};
    availabilityEntries.forEach(avail => {
      const dateStr = getMountainTimeDateString(avail.date);
      if (!availabilityMap[avail.employeeId]) {
        availabilityMap[avail.employeeId] = {};
      }
      if (!availabilityMap[avail.employeeId][dateStr]) {
        availabilityMap[avail.employeeId][dateStr] = {};
      }
      // If shiftType is null, it applies to all shifts for that day
      if (avail.shiftType === null) {
        availabilityMap[avail.employeeId][dateStr]['open'] = avail.isAvailable;
        availabilityMap[avail.employeeId][dateStr]['close'] = avail.isAvailable;
      } else {
        availabilityMap[avail.employeeId][dateStr][avail.shiftType] = avail.isAvailable;
      }
    });

    // Helper function to check if employee is available
    const isEmployeeAvailable = (employeeId: string, date: Date, shiftType: string): boolean => {
      const dateStr = getMountainTimeDateString(date);
      const employeeAvail = availabilityMap[employeeId]?.[dateStr];
      
      // If no availability entry exists, assume available (default behavior)
      if (!employeeAvail) {
        return true;
      }

      // Check specific shift type availability
      const shiftAvail = employeeAvail[shiftType];
      
      // If specific shift type is not set, check all-day availability
      if (shiftAvail === undefined) {
        return true; // No restriction for this shift type
      }

      return shiftAvail;
    };

    // Build requirements map: date -> shiftType -> requirements
    const requirementsMap: Record<string, Record<string, { cooks: number; bartenders: number; barbacks: number }>> = {};

    // First, add specific requirements
    specificRequirements.forEach(req => {
      const dateStr = getMountainTimeDateString(req.date);
      if (!requirementsMap[dateStr]) {
        requirementsMap[dateStr] = {};
      }
      requirementsMap[dateStr][req.shiftType] = {
        cooks: req.cooks,
        bartenders: req.bartenders,
        barbacks: req.barbacks,
      };
    });

    // Then, fill in from templates for dates without specific requirements
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = getMountainTimeDateString(currentDate);
      // Get day of week in Mountain Time
      const dayOfWeek = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'America/Denver'
      });
      const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayOfWeek);

      if (!requirementsMap[dateStr]) {
        requirementsMap[dateStr] = {};
      }

      // Get template entries for this day of week
      const dayTemplates = weeklyTemplates.filter(t => t.dayOfWeek === dayIndex);

      dayTemplates.forEach(template => {
        // Only use template if no specific requirement exists for this shift type
        if (!requirementsMap[dateStr][template.shiftType]) {
          requirementsMap[dateStr][template.shiftType] = {
            cooks: template.cooks,
            bartenders: template.bartenders,
            barbacks: template.barbacks,
          };
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Track employee shift counts for fair distribution
    const employeeShiftCounts: Record<string, number> = {};
    employees.forEach(emp => {
      employeeShiftCounts[emp.id] = 0;
    });

    // Generate schedules
    const schedulesToCreate: Array<{
      employeeId: string;
      date: Date;
      shiftType: ShiftType;
      startTime: Date;
      endTime: Date;
    }> = [];

    const warnings: string[] = [];

    // Process each date
    for (const [dateStr, shiftRequirements] of Object.entries(requirementsMap)) {
      const date = parseMountainTimeDate(dateStr);

      for (const [shiftType, reqs] of Object.entries(shiftRequirements)) {
        // Get employees already scheduled for this date/shift
        const alreadyScheduled = existingByDateAndShift[dateStr]?.[shiftType] || [];

        // Assign cooks
        const availableCooks = employeesByRole.cook.filter(
          e => !alreadyScheduled.includes(e.id) && isEmployeeAvailable(e.id, date, shiftType)
        );
        // Sort by shift count for fair distribution
        availableCooks.sort((a, b) => 
          (employeeShiftCounts[a.id] || 0) - (employeeShiftCounts[b.id] || 0)
        );

        for (let i = 0; i < reqs.cooks && i < availableCooks.length; i++) {
          const employee = availableCooks[i];
          const { startTime, endTime } = await calculateShiftTimes(
            date,
            shiftType as ShiftType,
            'cook'
          );
          schedulesToCreate.push({
            employeeId: employee.id,
            date,
            shiftType: shiftType as ShiftType,
            startTime,
            endTime,
          });
          employeeShiftCounts[employee.id] = (employeeShiftCounts[employee.id] || 0) + 1;
        }

        if (reqs.cooks > availableCooks.length) {
          warnings.push(
            `Not enough cooks for ${dateStr} ${shiftType} shift. Needed: ${reqs.cooks}, Available: ${availableCooks.length}`
          );
        }

        // Assign bartenders
        const availableBartenders = employeesByRole.bartender.filter(
          e => !alreadyScheduled.includes(e.id) && isEmployeeAvailable(e.id, date, shiftType)
        );
        availableBartenders.sort((a, b) => 
          (employeeShiftCounts[a.id] || 0) - (employeeShiftCounts[b.id] || 0)
        );

        for (let i = 0; i < reqs.bartenders && i < availableBartenders.length; i++) {
          const employee = availableBartenders[i];
          const { startTime, endTime } = await calculateShiftTimes(
            date,
            shiftType as ShiftType,
            'bartender'
          );
          schedulesToCreate.push({
            employeeId: employee.id,
            date,
            shiftType: shiftType as ShiftType,
            startTime,
            endTime,
          });
          employeeShiftCounts[employee.id] = (employeeShiftCounts[employee.id] || 0) + 1;
        }

        if (reqs.bartenders > availableBartenders.length) {
          warnings.push(
            `Not enough bartenders for ${dateStr} ${shiftType} shift. Needed: ${reqs.bartenders}, Available: ${availableBartenders.length}`
          );
        }

        // Assign barbacks
        const availableBarbacks = employeesByRole.barback.filter(
          e => !alreadyScheduled.includes(e.id) && isEmployeeAvailable(e.id, date, shiftType)
        );
        availableBarbacks.sort((a, b) => 
          (employeeShiftCounts[a.id] || 0) - (employeeShiftCounts[b.id] || 0)
        );

        for (let i = 0; i < reqs.barbacks && i < availableBarbacks.length; i++) {
          const employee = availableBarbacks[i];
          const { startTime, endTime } = await calculateShiftTimes(
            date,
            shiftType as ShiftType,
            'barback'
          );
          schedulesToCreate.push({
            employeeId: employee.id,
            date,
            shiftType: shiftType as ShiftType,
            startTime,
            endTime,
          });
          employeeShiftCounts[employee.id] = (employeeShiftCounts[employee.id] || 0) + 1;
        }

        if (reqs.barbacks > availableBarbacks.length) {
          warnings.push(
            `Not enough barbacks for ${dateStr} ${shiftType} shift. Needed: ${reqs.barbacks}, Available: ${availableBarbacks.length}`
          );
        }
      }
    }

    // Delete existing schedules if overwrite is enabled
    if (overwriteExisting && existingSchedules.length > 0) {
      await prisma.schedule.deleteMany({
        where: {
          date: {
            gte: start,
            lte: end,
          },
        },
      });
    }

    // Create new schedules (skip duplicates if not overwriting)
    const createdSchedules = [];
    const skippedSchedules = [];

    for (const scheduleData of schedulesToCreate) {
      // Check if schedule already exists
      const existing = await prisma.schedule.findUnique({
        where: {
          employeeId_date_shiftType: {
            employeeId: scheduleData.employeeId,
            date: scheduleData.date,
            shiftType: scheduleData.shiftType,
          },
        },
      });

      if (existing && !overwriteExisting) {
        skippedSchedules.push({
          employeeId: scheduleData.employeeId,
          date: scheduleData.date,
          shiftType: scheduleData.shiftType,
        });
        continue;
      }

      if (existing && overwriteExisting) {
        // Update existing schedule
        const updated = await prisma.schedule.update({
          where: { id: existing.id },
          data: {
            startTime: scheduleData.startTime,
            endTime: scheduleData.endTime,
          },
        });
        createdSchedules.push(updated);
      } else {
        // Create new schedule
        const created = await prisma.schedule.create({
          data: scheduleData,
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                role: true,
                hourlyWage: true,
              },
            },
          },
        });
        createdSchedules.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      created: createdSchedules.length,
      skipped: skippedSchedules.length,
      warnings,
      schedules: createdSchedules,
    });
  } catch (error) {
    return handleError(error, 'Failed to auto-generate schedules');
  }
}

