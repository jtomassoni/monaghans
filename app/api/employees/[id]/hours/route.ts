import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { calculateHoursWorked, calculateShiftCost } from '@/lib/schedule-helpers';

/**
 * Get employee hours and pay information
 * GET: Get hours worked, pay, and schedule information for an employee
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hourlyWage: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.clockIn = {};
      if (startDate) {
        dateFilter.clockIn.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.clockIn.lte = end;
      }
    }

    // Get shifts (actual worked time)
    const shifts = await prisma.shift.findMany({
      where: {
        employeeId: id,
        ...dateFilter,
      },
      orderBy: {
        clockIn: 'desc',
      },
    });

    // Calculate totals
    let totalHours = 0;
    let totalCost = 0;
    const shiftDetails = shifts.map(shift => {
      const hours = calculateHoursWorked(
        shift.clockIn,
        shift.clockOut,
        shift.breakMin
      );
      const cost = hours ? calculateShiftCost(hours, employee.hourlyWage) : null;
      
      if (hours) {
        totalHours += hours;
        if (cost) {
          totalCost += cost;
        }
      }

      return {
        id: shift.id,
        clockIn: shift.clockIn,
        clockOut: shift.clockOut,
        breakMin: shift.breakMin,
        hours,
        cost,
        notes: shift.notes,
      };
    });

    // Get upcoming schedules
    const now = new Date();
    const upcomingSchedules = await prisma.schedule.findMany({
      where: {
        employeeId: id,
        date: {
          gte: now,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json({
      employee,
      shifts: shiftDetails,
      totals: {
        hours: Math.round(totalHours * 100) / 100,
        cost: Math.round(totalCost * 100) / 100,
        shiftCount: shifts.length,
      },
      upcomingSchedules,
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch employee hours');
  }
}

