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
 * POST /api/private-dining-leads/[id]/contacts
 * Add a contact to a lead
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

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

    const contact = await prisma.leadContact.create({
      data: {
        leadId: id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        role: role?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    return handleError(error, 'Failed to create contact');
  }
}

