import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import {
  PRIVATE_DINING_NOTIFICATION_EMAILS_KEY,
  normalizeEmailList,
  parseNotificationEmailsJson,
} from '@/lib/private-dining-notifications';

async function requireAdminAccess(_req: NextRequest) {
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
 * GET /api/admin/private-dining-notifications
 * List notification recipient emails (admin only — not exposed on the public site).
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAdminAccess(_req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const row = await prisma.setting.findUnique({
      where: { key: PRIVATE_DINING_NOTIFICATION_EMAILS_KEY },
    });
    const emails = parseNotificationEmailsJson(row?.value);
    const resendConfigured = Boolean(
      process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()
    );
    return NextResponse.json({ emails, resendConfigured });
  } catch (error) {
    return handleError(error, 'Failed to load notification settings');
  }
}

/**
 * PUT /api/admin/private-dining-notifications
 * Replace notification recipient list (admin only).
 */
export async function PUT(req: NextRequest) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const rawList = Array.isArray(body.emails) ? body.emails : [];
    const emails = normalizeEmailList(
      rawList.map((e: unknown) => (typeof e === 'string' ? e : String(e)))
    );

    const existing = await prisma.setting.findUnique({
      where: { key: PRIVATE_DINING_NOTIFICATION_EMAILS_KEY },
    });

    const value = JSON.stringify(emails);
    const setting = await prisma.setting.upsert({
      where: { key: PRIVATE_DINING_NOTIFICATION_EMAILS_KEY },
      update: {
        value,
        description: 'Staff email addresses notified on new private dining form submissions',
      },
      create: {
        key: PRIVATE_DINING_NOTIFICATION_EMAILS_KEY,
        value,
        description: 'Staff email addresses notified on new private dining form submissions',
      },
    });

    const oldEmails = parseNotificationEmailsJson(existing?.value);
    await logActivity(
      user.id,
      existing ? 'update' : 'create',
      'setting',
      setting.id,
      'Private dining notification emails',
      {
        recipients: {
          before: oldEmails.join(', ') || '(none)',
          after: emails.join(', ') || '(none)',
        },
      },
      'Updated private dining notification recipients'
    );

    const resendConfigured = Boolean(
      process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()
    );
    return NextResponse.json({ emails, resendConfigured });
  } catch (error) {
    return handleError(error, 'Failed to save notification settings');
  }
}
