import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, handleError, logActivity } from '@/lib/api-helpers';
import {
  formatPrivateDiningLeadNotificationActivityLogDescription,
  getVerifiedStaffNotificationEmails,
  sendPrivateDiningLeadNotification,
} from '@/lib/private-dining-notifications';

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

    const leadPayload = {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      groupSize: lead.groupSize,
      preferredDate: lead.preferredDate,
      message: lead.message,
    };

    const recipients = await getVerifiedStaffNotificationEmails();
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No active staff notification emails configured for private dining alerts.' },
        { status: 422 }
      );
    }

    await sendPrivateDiningLeadNotification(leadPayload);

    const activityDescription = formatPrivateDiningLeadNotificationActivityLogDescription(
      leadPayload,
      recipients,
      'Re-sent private dining staff notification email.'
    );

    await prisma.leadNote.create({
      data: {
        leadId: lead.id,
        content: activityDescription,
        createdBy: user.id,
      },
    });

    await logActivity(user.id, 'update', 'setting', lead.id, lead.name, undefined, activityDescription);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to resend private dining notification');
  }
}
