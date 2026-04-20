import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import {
  buildContactChangeNote,
  buildContactRemovedNote,
  getUserIdForLeadNote,
} from '@/lib/private-dining-lead-timeline';

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
  const { session } = authResult;

  try {
    const { id: leadId, contactId } = await params;
    const body = await req.json();
    const { name, email, phone, role, notes } = body;

    const existing = await prisma.leadContact.findUnique({
      where: { id: contactId },
    });
    if (!existing || existing.leadId !== leadId) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (role !== undefined) updateData.role = role?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existing);
    }

    const before = {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      role: existing.role,
      notes: existing.notes,
    };
    const after = {
      name: (updateData.name as string | undefined) ?? existing.name,
      email:
        updateData.email !== undefined ? (updateData.email as string | null) : existing.email,
      phone:
        updateData.phone !== undefined ? (updateData.phone as string | null) : existing.phone,
      role: updateData.role !== undefined ? (updateData.role as string | null) : existing.role,
      notes:
        updateData.notes !== undefined ? (updateData.notes as string | null) : existing.notes,
    };

    const noteContent = buildContactChangeNote(before, after);
    const createdBy = await getUserIdForLeadNote(session);

    const contact = await prisma.$transaction(async (tx) => {
      const row = await tx.leadContact.update({
        where: { id: contactId },
        data: updateData,
      });
      if (noteContent) {
        await tx.leadNote.create({
          data: {
            leadId: leadId,
            content: noteContent,
            createdBy,
          },
        });
      }
      return row;
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
  const { session } = authResult;

  try {
    const { id: leadId, contactId } = await params;

    const existing = await prisma.leadContact.findUnique({
      where: { id: contactId },
    });
    if (!existing || existing.leadId !== leadId) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const snapshot = {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      role: existing.role,
      notes: existing.notes,
    };

    const createdBy = await getUserIdForLeadNote(session);

    await prisma.$transaction(async (tx) => {
      await tx.leadContact.delete({
        where: { id: contactId },
      });
      await tx.leadNote.create({
        data: {
          leadId: leadId,
          content: buildContactRemovedNote(snapshot),
          createdBy,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete contact');
  }
}

