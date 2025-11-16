import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Suppliers API
 * GET: List all suppliers
 * POST: Create a new supplier
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        connections: {
          where: { isActive: true },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    return handleError(error, 'Failed to fetch suppliers');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { name, provider, displayName, website, phone, email, address, notes } = body;

    if (!name || !provider) {
      return NextResponse.json(
        { error: 'Name and provider are required' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        provider,
        displayName: displayName || name,
        website: website || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        isActive: true,
      },
    });

    await logActivity(
      user.id,
      'create',
      'supplier',
      supplier.id,
      supplier.name,
      undefined,
      `created supplier "${supplier.name}"`
    );

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Supplier with this name or provider already exists' },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to create supplier');
  }
}

