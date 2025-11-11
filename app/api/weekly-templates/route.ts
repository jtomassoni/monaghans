import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Weekly Schedule Templates API
 * GET: List all templates
 * POST: Create new template entry
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};
    if (name) {
      where.name = name;
    }
    if (activeOnly) {
      where.isActive = true;
    }

    const templates = await prisma.weeklyScheduleTemplate.findMany({
      where,
      orderBy: [
        { name: 'asc' },
        { dayOfWeek: 'asc' },
        { shiftType: 'asc' },
      ],
    });

    return NextResponse.json(templates);
  } catch (error) {
    return handleError(error, 'Failed to fetch weekly templates');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
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

    // Validate required fields
    if (!name || dayOfWeek === undefined || !shiftType) {
      return NextResponse.json(
        { error: 'Name, day of week, and shift type are required' },
        { status: 400 }
      );
    }

    // Validate day of week (0-6)
    if (dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(Number(dayOfWeek))) {
      return NextResponse.json(
        { error: 'Day of week must be an integer between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate shift type
    if (!['open', 'close'].includes(shiftType)) {
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

    const template = await prisma.weeklyScheduleTemplate.create({
      data: {
        name,
        dayOfWeek: Number(dayOfWeek),
        shiftType,
        cooks: cooks || 0,
        bartenders: bartenders || 0,
        barbacks: barbacks || 0,
        notes: notes || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A template entry with this name, day, and shift type already exists' },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to create weekly template');
  }
}

