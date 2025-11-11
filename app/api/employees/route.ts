import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Employees API
 * GET: List all employees
 * POST: Create new employee
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const role = searchParams.get('role'); // Filter by role

    const where: any = {};
    
    // By default, exclude soft-deleted employees
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    
    if (activeOnly) {
      where.isActive = true;
    }
    if (role) {
      where.role = role;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: {
            shifts: true,
            schedules: true,
          },
        },
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    return handleError(error, 'Failed to fetch employees');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      pin,
      role,
      hourlyWage,
      hireDate,
      notes,
    } = body;

    // Validate required fields
    if (!name || !email || !role || hourlyWage === undefined) {
      return NextResponse.json(
        { error: 'Name, email, role, and hourly wage are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['cook', 'bartender', 'barback'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate hourly wage
    if (hourlyWage < 0) {
      return NextResponse.json(
        { error: 'Hourly wage must be non-negative' },
        { status: 400 }
      );
    }

    // Generate a random 4-digit PIN if not provided
    let finalPin = pin;
    if (!finalPin) {
      let attempts = 0;
      while (!finalPin && attempts < 100) {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        // Check if PIN is already taken
        const existing = await prisma.employee.findFirst({
          where: { pin: randomPin },
        });
        if (!existing) {
          finalPin = randomPin;
        }
        attempts++;
      }
      if (!finalPin) {
        return NextResponse.json(
          { error: 'Unable to generate unique PIN. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Validate PIN uniqueness if provided
      const existing = await prisma.employee.findFirst({
        where: { pin: finalPin },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'This PIN is already in use. Please choose a different PIN.' },
          { status: 400 }
        );
      }
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        phone: phone || null,
        pin: finalPin,
        role,
        hourlyWage: parseFloat(hourlyWage),
        hireDate: hireDate ? new Date(hireDate) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Check which unique constraint was violated
      if (error.meta?.target?.includes('email')) {
        return NextResponse.json(
          { error: 'An employee with this email already exists' },
          { status: 400 }
        );
      }
      if (error.meta?.target?.includes('pin')) {
        return NextResponse.json(
          { error: 'This PIN is already in use. Please choose a different PIN.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'A unique constraint violation occurred' },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to create employee');
  }
}

