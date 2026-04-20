import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import {
  buildContactAddedNote,
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
 * POST /api/private-dining-leads/[id]/contacts
 * Add a contact to a lead
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, role, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Contact name is required' },
        { status: 400 }
      );
    }

    const snapshot = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      role: role?.trim() || null,
      notes: notes?.trim() || null,
    };

    const createdBy = await getUserIdForLeadNote(session);

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.leadContact.create({
        data: {
          leadId: id,
          name: snapshot.name,
          email: snapshot.email,
          phone: snapshot.phone,
          role: snapshot.role,
          notes: snapshot.notes,
        },
      });
      await tx.leadNote.create({
        data: {
          leadId: id,
          content: buildContactAddedNote(snapshot),
          createdBy,
        },
      });
      return row;
    });

    return NextResponse.json(created);
  } catch (error) {
    return handleError(error, 'Failed to create contact');
  }
}

