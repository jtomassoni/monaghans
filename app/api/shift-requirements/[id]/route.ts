import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Shift Requirement API (single)
 * GET: Get requirement by ID
 * PATCH: Update requirement
 * DELETE: Delete requirement
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const requirement = await prisma.shiftRequirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(requirement);
  } catch (error) {
    return handleError(error, 'Failed to fetch requirement');
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
      cooks,
      bartenders,
      barbacks,
      notes,
      isFilled,
    } = body;

    // Get current requirement
    const current = await prisma.shiftRequirement.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }

    // Validate shift type if provided
    if (shiftType && !['open', 'close'].includes(shiftType)) {
      return NextResponse.json(
        { error: 'Invalid shift type. Must be "open" or "close"' },
        { status: 400 }
      );
    }

    // Validate counts
    const counts = { cooks, bartenders, barbacks };
    for (const [key, value] of Object.entries(counts)) {
      if (value !== undefined && (value < 0 || !Number.isInteger(Number(value)))) {
        return NextResponse.json(
          { error: `${key} must be a non-negative integer` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (date) {
      const requirementDate = new Date(date);
      requirementDate.setHours(0, 0, 0, 0);
      updateData.date = requirementDate;
    }
    if (shiftType) updateData.shiftType = shiftType;
    if (cooks !== undefined) updateData.cooks = cooks;
    if (bartenders !== undefined) updateData.bartenders = bartenders;
    if (barbacks !== undefined) updateData.barbacks = barbacks;
    if (notes !== undefined) updateData.notes = notes || null;
    if (isFilled !== undefined) updateData.isFilled = isFilled;

    // Check for duplicate if date or shift type changed
    if (date || shiftType) {
      const requirementDate = date ? new Date(date) : current.date;
      requirementDate.setHours(0, 0, 0, 0);
      const shiftTypeToUse = shiftType || current.shiftType;

      const duplicate = await prisma.shiftRequirement.findUnique({
        where: {
          date_shiftType: {
            date: requirementDate,
            shiftType: shiftTypeToUse,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: 'A requirement already exists for this date and shift type' },
          { status: 400 }
        );
      }
    }

    const requirement = await prisma.shiftRequirement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(requirement);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A requirement already exists for this date and shift type' },
        { status: 400 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to update requirement');
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

    await prisma.shiftRequirement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to delete requirement');
  }
}

