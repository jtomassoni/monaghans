import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Employee API (single)
 * GET: Get employee by ID
 * PATCH: Update employee
 * DELETE: Soft delete employee (sets deletedAt timestamp, hides from UI)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const employee = await prisma.employee.findFirst({
      where: { 
        id,
        deletedAt: null, // Only return non-deleted employees
      },
      include: {
        shifts: {
          orderBy: { clockIn: 'desc' },
          take: 10, // Last 10 shifts
        },
        schedules: {
          orderBy: { date: 'desc' },
          take: 10, // Last 10 scheduled shifts
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    return handleError(error, 'Failed to fetch employee');
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
      email,
      phone,
      pin,
      role,
      hourlyWage,
      isActive,
      hireDate,
      notes,
    } = body;

    // Validate role if provided
    if (role) {
      const validRoles = ['cook', 'bartender', 'barback'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate hourly wage if provided
    if (hourlyWage !== undefined && hourlyWage < 0) {
      return NextResponse.json(
        { error: 'Hourly wage must be non-negative' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email !== undefined && !email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate PIN uniqueness if being updated
    if (pin !== undefined) {
      if (pin) {
        // Check if PIN is already taken by another employee
        const existing = await prisma.employee.findFirst({
          where: { 
            pin: pin,
            id: { not: id }, // Exclude current employee
          },
        });
        if (existing) {
          return NextResponse.json(
            { error: 'This PIN is already in use. Please choose a different PIN.' },
            { status: 400 }
          );
        }
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (pin !== undefined) updateData.pin = pin || null;
    if (role !== undefined) updateData.role = role;
    if (hourlyWage !== undefined) updateData.hourlyWage = parseFloat(hourlyWage);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null;
    if (notes !== undefined) updateData.notes = notes || null;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(employee);
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
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to update employee');
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

    // Check if employee exists and is not already deleted
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (existing.deletedAt) {
      return NextResponse.json(
        { error: 'Employee is already deleted' },
        { status: 400 }
      );
    }

    // Soft delete by setting deletedAt timestamp (data preserved, hidden from UI)
    const employee = await prisma.employee.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isActive: false, // Also deactivate when deleting
      },
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }
    return handleError(error, 'Failed to delete employee');
  }
}

