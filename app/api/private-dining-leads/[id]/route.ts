import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';

// Helper to require admin/owner access
async function requireAdminAccess(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin or Owner access required' }, { status: 403 });
  }
  return { session, permissions };
}

/**
 * GET /api/private-dining-leads/[id]
 * Get a single lead with all related data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const lead = await prisma.privateDiningLead.findUnique({
      where: { id },
      include: {
        event: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        contacts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(lead);
  } catch (error) {
    return handleError(error, 'Failed to fetch lead');
  }
}

/**
 * PATCH /api/private-dining-leads/[id]
 * Update a lead
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, groupSize, preferredDate, message, status } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (groupSize !== undefined) updateData.groupSize = groupSize;
    if (preferredDate !== undefined) updateData.preferredDate = new Date(preferredDate);
    if (message !== undefined) updateData.message = message;
    if (status !== undefined) updateData.status = status;

    const lead = await prisma.privateDiningLead.update({
      where: { id },
      data: updateData,
      include: {
        event: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        contacts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    return handleError(error, 'Failed to update lead');
  }
}

/**
 * DELETE /api/private-dining-leads/[id]
 * Delete a lead
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    await prisma.privateDiningLead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete lead');
  }
}

