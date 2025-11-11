import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { calculateHoursWorked, calculateShiftCost } from '@/lib/schedule-helpers';

/**
 * Shifts API (clock in/out tracking)
 * GET: List shifts (with optional filters)
 * POST: Clock in (create new shift) or clock out (update existing shift)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const openOnly = searchParams.get('openOnly') === 'true'; // Only shifts without clock out

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (startDate || endDate) {
      where.clockIn = {};
      if (startDate) {
        where.clockIn.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.clockIn.lte = end;
      }
    }

    if (openOnly) {
      where.clockOut = null;
    }

    const shifts = await prisma.shift.findMany({
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
      orderBy: { clockIn: 'desc' },
    });

    // Calculate hours worked and cost for each shift
    const shiftsWithCalculations = shifts.map(shift => {
      const hoursWorked = calculateHoursWorked(
        shift.clockIn,
        shift.clockOut,
        shift.breakMin
      );
      const cost = calculateShiftCost(hoursWorked, shift.employee.hourlyWage);

      return {
        ...shift,
        hoursWorked,
        cost,
      };
    });

    return NextResponse.json(shiftsWithCalculations);
  } catch (error) {
    return handleError(error, 'Failed to fetch shifts');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      employeeId,
      action, // "clockIn" or "clockOut"
      scheduleId,
      breakMin,
      notes,
    } = body;

    if (!employeeId || !action) {
      return NextResponse.json(
        { error: 'Employee ID and action are required' },
        { status: 400 }
      );
    }

    if (!['clockIn', 'clockOut'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "clockIn" or "clockOut"' },
        { status: 400 }
      );
    }

    if (action === 'clockIn') {
      // Check if employee has an open shift
      const openShift = await prisma.shift.findFirst({
        where: {
          employeeId,
          clockOut: null,
        },
      });

      if (openShift) {
        return NextResponse.json(
          { error: 'Employee already has an open shift. Please clock out first.' },
          { status: 400 }
        );
      }

      // Create new shift
      const shift = await prisma.shift.create({
        data: {
          employeeId,
          scheduleId: scheduleId || null,
          clockIn: new Date(),
          breakMin: breakMin || 0,
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

      return NextResponse.json(shift, { status: 201 });
    } else {
      // Clock out - find the most recent open shift
      const openShift = await prisma.shift.findFirst({
        where: {
          employeeId,
          clockOut: null,
        },
        orderBy: { clockIn: 'desc' },
      });

      if (!openShift) {
        return NextResponse.json(
          { error: 'No open shift found for this employee' },
          { status: 400 }
        );
      }

      // Update shift with clock out time
      const updateData: any = {
        clockOut: new Date(),
      };

      if (breakMin !== undefined) {
        updateData.breakMin = breakMin;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const shift = await prisma.shift.update({
        where: { id: openShift.id },
        data: updateData,
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

      // Calculate hours worked and cost
      const hoursWorked = calculateHoursWorked(
        shift.clockIn,
        shift.clockOut,
        shift.breakMin
      );
      const cost = calculateShiftCost(hoursWorked, shift.employee.hourlyWage);

      return NextResponse.json({
        ...shift,
        hoursWorked,
        cost,
      });
    }
  } catch (error) {
    return handleError(error, 'Failed to process shift action');
  }
}

