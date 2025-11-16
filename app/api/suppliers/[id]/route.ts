import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Supplier API
 * GET: Get supplier by ID
 * PUT: Update supplier
 * DELETE: Delete supplier (soft delete)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        connections: {
          orderBy: { createdAt: 'desc' },
        },
        products: {
          take: 100,
          orderBy: { name: 'asc' },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    return handleError(error, 'Failed to fetch supplier');
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, displayName, website, phone, email, address, notes, isActive } = body;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        displayName,
        website: website || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    await logActivity(
      user.id,
      'update',
      'supplier',
      supplier.id,
      supplier.name,
      undefined,
      `updated supplier "${supplier.name}"`
    );

    return NextResponse.json(supplier);
  } catch (error) {
    return handleError(error, 'Failed to update supplier');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Soft delete - set isActive to false
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity(
      user.id,
      'delete',
      'supplier',
      supplier.id,
      supplier.name,
      undefined,
      `deleted supplier "${supplier.name}"`
    );

    return NextResponse.json(supplier);
  } catch (error) {
    return handleError(error, 'Failed to delete supplier');
  }
}

