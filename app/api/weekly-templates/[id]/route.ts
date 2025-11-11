import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Weekly Template API (single)
 * GET: Get template by ID
 * PATCH: Update template
 * DELETE: Delete template
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const template = await prisma.weeklyScheduleTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    return handleError(error, 'Failed to fetch template');
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
      name,
      dayOfWeek,
      shiftType,
      cooks,
      bartenders,
      barbacks,
      notes,
      isActive,
    } = body;

    // Get current template
    const current = await prisma.weeklyScheduleTemplate.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Validate day of week if provided
    if (dayOfWeek !== undefined) {
      if (dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(Number(dayOfWeek))) {
        return NextResponse.json(
          { error: 'Day of week must be an integer between 0 (Sunday) and 6 (Saturday)' },
          { status: 400 }
        );
      }
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
    if (name) updateData.name = name;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = Number(dayOfWeek);
    if (shiftType) updateData.shiftType = shiftType;
    if (cooks !== undefined) updateData.cooks = cooks;
    if (bartenders !== undefined) updateData.bartenders = bartenders;
    if (barbacks !== undefined) updateData.barbacks = barbacks;
    if (notes !== undefined) updateData.notes = notes || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Check for duplicate if name, day, or shift type changed
    if (name || dayOfWeek !== undefined || shiftType) {
      const nameToUse = name || current.name;
      const dayToUse = dayOfWeek !== undefined ? Number(dayOfWeek) : current.dayOfWeek;
      const shiftTypeToUse = shiftType || current.shiftType;

      const duplicate = await prisma.weeklyScheduleTemplate.findUnique({
        where: {
          dayOfWeek_shiftType_name: {
            dayOfWeek: dayToUse,
            shiftType: shiftTypeToUse,
            name: nameToUse,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: 'A template entry with this name, day, and shift type already exists' },
          { status: 400 }
        );
      }
    }

    const template = await prisma.weeklyScheduleTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(template);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A template entry with this name, day, and shift type already exists' },
        { status: 400 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to update template');
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

    await prisma.weeklyScheduleTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to delete template');
  }
}

