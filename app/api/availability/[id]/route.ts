import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Employee Availability API - Single Entry
 * GET: Get availability entry by ID
 * PATCH: Update availability entry
 * DELETE: Delete availability entry
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const availability = await prisma.employeeAvailability.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!availability) {
      return NextResponse.json({ error: 'Availability entry not found' }, { status: 404 });
    }

    return NextResponse.json(availability);
  } catch (error) {
    return handleError(error, 'Failed to fetch availability');
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
      date,
      shiftType,
      isAvailable,
      notes,
    } = body;

    // Get current availability entry
    const current = await prisma.employeeAvailability.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: 'Availability entry not found' },
        { status: 404 }
      );
    }

    // Validate shift type if provided
    if (shiftType !== undefined && shiftType !== null && !['open', 'close'].includes(shiftType)) {
      return NextResponse.json(
        { error: 'Invalid shift type. Must be "open", "close", or null' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (date) {
      const availabilityDate = new Date(date);
      availabilityDate.setHours(0, 0, 0, 0);
      updateData.date = availabilityDate;
    }
    if (shiftType !== undefined) updateData.shiftType = shiftType || null;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (notes !== undefined) updateData.notes = notes || null;

    // Check for duplicate if date or shift type changed
    if (date || shiftType !== undefined) {
      const checkDate = updateData.date || current.date;
      const checkShiftType = updateData.shiftType !== undefined ? updateData.shiftType : current.shiftType;

      const existing = await prisma.employeeAvailability.findUnique({
        where: {
          employeeId_date_shiftType: {
            employeeId: current.employeeId,
            date: checkDate,
            shiftType: checkShiftType,
          },
        },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: 'An availability entry already exists for this employee, date, and shift type' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.employeeAvailability.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An availability entry already exists for this employee, date, and shift type' },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to update availability');
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

    const availability = await prisma.employeeAvailability.findUnique({
      where: { id },
    });

    if (!availability) {
      return NextResponse.json(
        { error: 'Availability entry not found' },
        { status: 404 }
      );
    }

    await prisma.employeeAvailability.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete availability');
  }
}

