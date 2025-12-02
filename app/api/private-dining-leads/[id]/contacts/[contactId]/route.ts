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
 * PATCH /api/private-dining-leads/[id]/contacts/[contactId]
 * Update a contact
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { contactId } = await params;
    const body = await req.json();
    const { name, email, phone, role, notes } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (role !== undefined) updateData.role = role?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const contact = await prisma.leadContact.update({
      where: { id: contactId },
      data: updateData,
    });

    return NextResponse.json(contact);
  } catch (error) {
    return handleError(error, 'Failed to update contact');
  }
}

/**
 * DELETE /api/private-dining-leads/[id]/contacts/[contactId]
 * Delete a contact
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { contactId } = await params;
    await prisma.leadContact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete contact');
  }
}

