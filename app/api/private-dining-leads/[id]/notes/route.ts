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
 * POST /api/private-dining-leads/[id]/notes
 * Add a note to a lead
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
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
    });

    const note = await prisma.leadNote.create({
      data: {
        leadId: id,
        content: content.trim(),
        createdBy: user?.id || null,
      },
      include: {
        lead: true,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    return handleError(error, 'Failed to create note');
  }
}

