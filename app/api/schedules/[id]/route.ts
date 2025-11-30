import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { calculateShiftTimes, type ShiftType, type EmployeeRole } from '@/lib/schedule-helpers';
import { parseMountainTimeDate } from '@/lib/timezone';

/**
 * Schedule API (single)
 * GET: Get schedule by ID
 * PATCH: Update schedule
 * DELETE: Delete schedule
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
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

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    return handleError(error, 'Failed to fetch schedule');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();

    const {
      employeeId,
      date,
      shiftType,
      notes,
    } = body;

    // Get current schedule
    const currentSchedule = await prisma.schedule.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!currentSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Determine which employee and role to use
    const employeeIdToUse = employeeId || currentSchedule.employeeId;
    const employee = await prisma.employee.findUnique({
      where: { id: employeeIdToUse },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Determine shift type and date
    // Parse date as Mountain Time if provided, otherwise use current date
    const scheduleDate = date 
      ? parseMountainTimeDate(date.includes('T') ? date.split('T')[0] : date)
      : currentSchedule.date;
    const shiftTypeToUse = shiftType || currentSchedule.shiftType;

    // Validate shift type if provided
    if (shiftType && !['open', 'close'].includes(shiftType)) {
      return NextResponse.json(
        { error: 'Invalid shift type. Must be "open" or "close"' },
        { status: 400 }
      );
    }

    // Recalculate shift times if date, shift type, or employee changed
    const needsRecalculation = date || shiftType || employeeId;
    let startTime = currentSchedule.startTime;
    let endTime = currentSchedule.endTime;

    if (needsRecalculation) {
      const times = await calculateShiftTimes(
        scheduleDate,
        shiftTypeToUse as ShiftType,
        employee.role as EmployeeRole
      );
      startTime = times.startTime;
      endTime = times.endTime;
    }

    const updateData: any = {};
    if (employeeId) updateData.employeeId = employeeId;
    if (date) updateData.date = scheduleDate;
    if (shiftType) updateData.shiftType = shiftTypeToUse;
    if (needsRecalculation) {
      updateData.startTime = startTime;
      updateData.endTime = endTime;
    }
    if (notes !== undefined) updateData.notes = notes || null;

    // Check for duplicate if employee, date, or shift type changed
    if (employeeId || date || shiftType) {
      const duplicate = await prisma.schedule.findUnique({
        where: {
          employeeId_date_shiftType: {
            employeeId: employeeIdToUse,
            date: scheduleDate,
            shiftType: shiftTypeToUse,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: 'Employee already has this shift type scheduled for this date' },
          { status: 400 }
        );
      }
    }

    const schedule = await prisma.schedule.update({
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

    return NextResponse.json(schedule);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This schedule already exists' },
        { status: 400 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to update schedule');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    await prisma.schedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to delete schedule');
  }
}

