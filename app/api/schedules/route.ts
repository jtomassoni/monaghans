import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { calculateShiftTimes, type ShiftType, type EmployeeRole } from '@/lib/schedule-helpers';
import { parseMountainTimeDate } from '@/lib/timezone';

/**
 * Schedules API
 * GET: List schedules (with optional date range filter)
 * POST: Create new schedule
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  // Check if staff management feature is enabled
  const isStaffManagementEnabled = await isFeatureEnabled('staff_management');
  if (!isStaffManagementEnabled) {
    return NextResponse.json(
      { error: 'Staff management feature is not enabled' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        // Parse as Mountain Time - handle both YYYY-MM-DD and ISO strings
        const dateStr = startDate.includes('T') ? startDate.split('T')[0] : startDate;
        where.date.gte = parseMountainTimeDate(dateStr);
      }
      if (endDate) {
        // Parse as Mountain Time - handle both YYYY-MM-DD and ISO strings
        const dateStr = endDate.includes('T') ? endDate.split('T')[0] : endDate;
        const end = parseMountainTimeDate(dateStr);
        end.setUTCHours(23, 59, 59, 999); // Include entire end date
        where.date.lte = end;
      }
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const schedules = await prisma.schedule.findMany({
      where,
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
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    return handleError(error, 'Failed to fetch schedules');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  // Check if staff management feature is enabled
  const isStaffManagementEnabled = await isFeatureEnabled('staff_management');
  if (!isStaffManagementEnabled) {
    return NextResponse.json(
      { error: 'Staff management feature is not enabled' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      employeeId,
      date,
      shiftType,
      notes,
    } = body;

    // Validate required fields
    if (!employeeId || !date || !shiftType) {
      return NextResponse.json(
        { error: 'Employee ID, date, and shift type are required' },
        { status: 400 }
      );
    }

    // Get employee to check role
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Parse date as Mountain Time (handle both YYYY-MM-DD and ISO strings)
    const dateStr = date.includes('T') ? date.split('T')[0] : date;
    const scheduleDate = parseMountainTimeDate(dateStr);
    let startTime: Date;
    let endTime: Date;
    
    // For known shift types, use calculateShiftTimes; for custom types, use default times
    if (shiftType === 'open' || shiftType === 'close') {
      const times = await calculateShiftTimes(
        scheduleDate,
        shiftType as ShiftType,
        employee.role as EmployeeRole
      );
      startTime = times.startTime;
      endTime = times.endTime;
    } else {
      // For custom shift types, use default times (9am-5pm for now)
      // In the future, this could be configurable per shift type
      startTime = new Date(scheduleDate);
      startTime.setHours(9, 0, 0, 0);
      endTime = new Date(scheduleDate);
      endTime.setHours(17, 0, 0, 0);
    }

    // Check for duplicate schedule
    const existing = await prisma.schedule.findUnique({
      where: {
        employeeId_date_shiftType: {
          employeeId,
          date: scheduleDate,
          shiftType,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Employee already has this shift type scheduled for this date' },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.create({
      data: {
        employeeId,
        date: scheduleDate,
        shiftType,
        startTime,
        endTime,
        notes: notes || null,
      },
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

    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This schedule already exists' },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to create schedule');
  }
}

