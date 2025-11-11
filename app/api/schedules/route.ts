import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { calculateShiftTimes, type ShiftType, type EmployeeRole } from '@/lib/schedule-helpers';

/**
 * Schedules API
 * GET: List schedules (with optional date range filter)
 * POST: Create new schedule
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
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

    // Validate shift type
    const validShiftTypes: ShiftType[] = ['open', 'close'];
    if (!validShiftTypes.includes(shiftType)) {
      return NextResponse.json(
        { error: `Invalid shift type. Must be one of: ${validShiftTypes.join(', ')}` },
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

    // Calculate shift times based on role and shift type
    const scheduleDate = new Date(date);
    const { startTime, endTime } = await calculateShiftTimes(
      scheduleDate,
      shiftType,
      employee.role as EmployeeRole
    );

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

