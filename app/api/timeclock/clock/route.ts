import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, logActivity } from '@/lib/api-helpers';
import { calculateHoursWorked, calculateShiftCost } from '@/lib/schedule-helpers';

/**
 * Timeclock Clock In/Out API
 * POST: Clock in or clock out using employee ID
 * No authentication required - public endpoint (but requires employeeId)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      employeeId,
      action, // "clockIn" or "clockOut"
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

    // Verify employee exists and is active
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found or inactive' },
        { status: 404 }
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
          { error: 'You already have an open shift. Please clock out first.' },
          { status: 400 }
        );
      }

      // Create new shift
      const shift = await prisma.shift.create({
        data: {
          employeeId,
          clockIn: new Date(),
          breakMin: 0,
          notes: notes || null,
        },
      });

      // Log activity - find user by employee email
      try {
        const user = await prisma.user.findUnique({
          where: { email: employee.email },
        });
        
        if (user) {
          await logActivity(
            user.id,
            'clockIn',
            'shift',
            shift.id,
            employee.name,
            undefined,
            `Clocked in at ${new Date(shift.clockIn).toLocaleTimeString()}`
          );
        }
      } catch (error) {
        // Don't fail the request if logging fails
        console.error('Failed to log clock in activity:', error);
      }

      return NextResponse.json({
        success: true,
        shift,
      });
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
          { error: 'No open shift found. Please clock in first.' },
          { status: 400 }
        );
      }

      // Update shift with clock out time
      const updateData: any = {
        clockOut: new Date(),
      };

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
              email: true,
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

      // Log activity - find user by employee email
      try {
        const user = await prisma.user.findUnique({
          where: { email: shift.employee.email },
        });
        
        if (user) {
          await logActivity(
            user.id,
            'clockOut',
            'shift',
            shift.id,
            shift.employee.name,
            undefined,
            `Clocked out at ${new Date(shift.clockOut!).toLocaleTimeString()} - Worked ${hoursWorked?.toFixed(2) ?? '0.00'} hours`
          );
        }
      } catch (error) {
        // Don't fail the request if logging fails
        console.error('Failed to log clock out activity:', error);
      }

      return NextResponse.json({
        success: true,
        shift: {
          ...shift,
          hoursWorked,
          cost,
        },
        hoursWorked,
        cost,
      });
    }
  } catch (error) {
    return handleError(error, 'Failed to process clock action');
  }
}

