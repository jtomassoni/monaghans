import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Supplier Connections API
 * GET: List connections for a supplier
 * POST: Create a new connection
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const connections = await prisma.supplierConnection.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Don't return credentials in list view
    const sanitized = connections.map(conn => ({
      ...conn,
      credentials: '[REDACTED]',
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    return handleError(error, 'Failed to fetch connections');
  }
}

export async function POST(
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
    const { name, credentials, config, syncFrequency } = body;

    if (!name || !credentials) {
      return NextResponse.json(
        { error: 'Name and credentials are required' },
        { status: 400 }
      );
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // In production, encrypt credentials before storing
    const connection = await prisma.supplierConnection.create({
      data: {
        supplierId: id,
        name,
        credentials: JSON.stringify(credentials), // Store as JSON string (should be encrypted)
        config: config ? JSON.stringify(config) : null,
        syncFrequency: syncFrequency || 'weekly',
        isActive: true,
      },
    });

    await logActivity(
      user.id,
      'create',
      'supplierConnection',
      connection.id,
      connection.name,
      undefined,
      `created connection "${connection.name}" for supplier "${supplier.name}"`
    );

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create connection');
  }
}

