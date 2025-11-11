import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

/**
 * Timeclock PIN Verification API
 * POST: Verify employee PIN and return employee info
 * No authentication required - public endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      );
    }

    // Find employee by PIN
    const employee = await prisma.employee.findFirst({
      where: {
        pin: pin,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Invalid PIN or employee not found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      employee,
    });
  } catch (error) {
    return handleError(error, 'Failed to verify PIN');
  }
}

