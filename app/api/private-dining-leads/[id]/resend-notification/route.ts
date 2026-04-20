import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { sendPrivateDiningLeadNotification } from '@/lib/private-dining-notifications';

async function requireAdminAccess() {
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

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const lead = await prisma.privateDiningLead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        groupSize: true,
        preferredDate: true,
        message: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await sendPrivateDiningLeadNotification(lead);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to resend lead notification');
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, handleError, logActivity } from '@/lib/api-helpers';
import { sendPrivateDiningLeadNotification } from '@/lib/private-dining-notifications';

async function requireAdminAccess() {
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
 * POST /api/private-dining-leads/[id]/resend-notification
 * Re-send internal lead notification email to active recipients.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const lead = await prisma.privateDiningLead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await sendPrivateDiningLeadNotification({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      groupSize: lead.groupSize,
      preferredDate: lead.preferredDate,
      message: lead.message,
    });

    await logActivity(
      user.id,
      'update',
      'setting',
      lead.id,
      lead.name,
      undefined,
      `Re-sent private dining notification email for lead ${lead.name}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to resend private dining notification');
  }
}
