import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

/**
 * Timeclock Shift API
 * GET: Get current open shift for an employee
 * No authentication required - public endpoint (but requires employeeId)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Find open shift for employee
    const shift = await prisma.shift.findFirst({
      where: {
        employeeId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    });

    if (!shift) {
      return NextResponse.json(null);
    }

    return NextResponse.json(shift);
  } catch (error) {
    return handleError(error, 'Failed to fetch shift');
  }
}

