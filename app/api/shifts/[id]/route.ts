import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { calculateHoursWorked, calculateShiftCost } from '@/lib/schedule-helpers';

/**
 * Shift Update API
 * PATCH: Update shift times (admin override)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const { clockIn, clockOut, breakMin, notes } = body;

    // Build update data
    const updateData: any = {};

    if (clockIn !== undefined) {
      updateData.clockIn = new Date(clockIn);
    }

    if (clockOut !== undefined) {
      updateData.clockOut = clockOut ? new Date(clockOut) : null;
    }

    if (breakMin !== undefined) {
      updateData.breakMin = parseInt(breakMin) || 0;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    // Update the shift
    const shift = await prisma.shift.update({
      where: { id },
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
  } catch (error) {
    return handleError(error, 'Failed to update shift');
  }
}

