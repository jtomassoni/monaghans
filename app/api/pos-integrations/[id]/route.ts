import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * GET: Get a specific POS integration
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const integration = await prisma.pOSIntegration.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ error: 'POS integration not found' }, { status: 404 });
    }

    // Don't return credentials
    const safeIntegration = {
      ...integration,
      credentials: '[REDACTED]',
    };

    return NextResponse.json(safeIntegration);
  } catch (error) {
    return handleError(error, 'Failed to fetch POS integration');
  }
}

/**
 * PUT: Update a POS integration
 */
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

    const integration = await prisma.pOSIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json({ error: 'POS integration not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.syncFrequency !== undefined) updateData.syncFrequency = body.syncFrequency;
    if (body.config !== undefined) updateData.config = JSON.stringify(body.config);
    if (body.credentials !== undefined) {
      // Only update credentials if provided (merge with existing)
      const existingCredentials = JSON.parse(integration.credentials);
      updateData.credentials = JSON.stringify({
        ...existingCredentials,
        ...body.credentials,
      });
    }

    const updated = await prisma.pOSIntegration.update({
      where: { id },
      data: updateData,
    });

    await logActivity(
      user.id,
      'update',
      'posIntegration',
      updated.id,
      updated.name,
      undefined,
      `updated POS integration "${updated.name}"`
    );

    const safeIntegration = {
      ...updated,
      credentials: '[REDACTED]',
    };

    return NextResponse.json(safeIntegration);
  } catch (error) {
    return handleError(error, 'Failed to update POS integration');
  }
}

/**
 * DELETE: Delete a POS integration
 */
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
    const integration = await prisma.pOSIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json({ error: 'POS integration not found' }, { status: 404 });
    }

    await prisma.pOSIntegration.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'posIntegration',
      id,
      integration.name,
      undefined,
      `deleted POS integration "${integration.name}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete POS integration');
  }
}

