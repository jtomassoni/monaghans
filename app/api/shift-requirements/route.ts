import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Shift Requirements API
 * GET: List shift requirements (with optional date range filter)
 * POST: Create new shift requirement
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const requirements = await prisma.shiftRequirement.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { shiftType: 'asc' },
      ],
    });

    return NextResponse.json(requirements);
  } catch (error) {
    return handleError(error, 'Failed to fetch shift requirements');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
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

    // Validate required fields
    if (!date || !shiftType) {
      return NextResponse.json(
        { error: 'Date and shift type are required' },
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

    // Validate counts are non-negative integers
    const counts = { cooks, bartenders, barbacks };
    for (const [key, value] of Object.entries(counts)) {
      if (value !== undefined && (value < 0 || !Number.isInteger(Number(value)))) {
        return NextResponse.json(
          { error: `${key} must be a non-negative integer` },
          { status: 400 }
        );
      }
    }

    const requirementDate = new Date(date);
    requirementDate.setHours(0, 0, 0, 0);

    // Check for existing requirement
    const existing = await prisma.shiftRequirement.findUnique({
      where: {
        date_shiftType: {
          date: requirementDate,
          shiftType,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A requirement already exists for this date and shift type' },
        { status: 400 }
      );
    }

    const requirement = await prisma.shiftRequirement.create({
      data: {
        date: requirementDate,
        shiftType,
        cooks: cooks || 0,
        bartenders: bartenders || 0,
        barbacks: barbacks || 0,
        notes: notes || null,
        isFilled: isFilled ?? false,
      },
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A requirement already exists for this date and shift type' },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to create shift requirement');
  }
}

