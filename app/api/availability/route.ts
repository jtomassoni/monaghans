import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { parseMountainTimeDate } from '@/lib/timezone';

/**
 * Employee Availability API
 * GET: List availability entries (with optional filters)
 * POST: Create new availability entry
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shiftType = searchParams.get('shiftType');

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        // Parse as Mountain Time - handle both YYYY-MM-DD and ISO strings
        const dateStr = startDate.includes('T') ? startDate.split('T')[0] : startDate;
        where.date.gte = parseMountainTimeDate(dateStr);
      }
      if (endDate) {
        // Parse as Mountain Time - handle both YYYY-MM-DD and ISO strings
        const dateStr = endDate.includes('T') ? endDate.split('T')[0] : endDate;
        const end = parseMountainTimeDate(dateStr);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (shiftType) {
      where.shiftType = shiftType;
    }

    const availability = await prisma.employeeAvailability.findMany({
      where,
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
      orderBy: [
        { date: 'asc' },
        { shiftType: 'asc' },
      ],
    });

    return NextResponse.json(availability);
  } catch (error) {
    return handleError(error, 'Failed to fetch availability');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      employeeId,
      date,
      shiftType,
      isAvailable,
      notes,
    } = body;

    // Validate required fields
    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'Employee ID and date are required' },
        { status: 400 }
      );
    }

    // Validate shift type if provided
    if (shiftType && !['open', 'close'].includes(shiftType)) {
      return NextResponse.json(
        { error: 'Invalid shift type. Must be "open", "close", or null' },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Parse date as Mountain Time (handle both YYYY-MM-DD and ISO strings)
    const dateStr = date.includes('T') ? date.split('T')[0] : date;
    const availabilityDate = parseMountainTimeDate(dateStr);

    // Check for existing availability entry
    const existing = await prisma.employeeAvailability.findUnique({
      where: {
        employeeId_date_shiftType: {
          employeeId,
          date: availabilityDate,
          shiftType: shiftType || null,
        },
      },
    });

    if (existing) {
      // Update existing entry
      const updated = await prisma.employeeAvailability.update({
        where: { id: existing.id },
        data: {
          isAvailable: isAvailable !== undefined ? isAvailable : true,
          notes: notes || null,
        },
      });

      return NextResponse.json(updated);
    }

    // Create new availability entry
    const availability = await prisma.employeeAvailability.create({
      data: {
        employeeId,
        date: availabilityDate,
        shiftType: shiftType || null,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        notes: notes || null,
      },
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

    return NextResponse.json(availability, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An availability entry already exists for this employee, date, and shift type' },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to create availability');
  }
}

