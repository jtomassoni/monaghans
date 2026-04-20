import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import {
  assertResendFromEnvIfConfigured,
  listStaffRecipientsForAdmin,
  migrateLegacyNotificationRecipientsIfNeeded,
  normalizeEmailList,
  STAFF_VERIFICATION_EMAIL_SUBJECT,
  syncStaffRecipientsFromDesiredList,
  updateStaffRecipientActive,
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

function jsonResponse(recipients: Awaited<ReturnType<typeof listStaffRecipientsForAdmin>>) {
  const resendConfigured = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()
  );
  const emails = recipients.map((r) => r.email);
  return NextResponse.json({
    recipients,
    emails,
    resendConfigured,
    verificationEmailSubject: STAFF_VERIFICATION_EMAIL_SUBJECT,
  });
}

/**
 * GET /api/admin/private-dining-notifications
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAdminAccess(_req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    assertResendFromEnvIfConfigured();
    await migrateLegacyNotificationRecipientsIfNeeded();
    const recipients = await listStaffRecipientsForAdmin();
    return jsonResponse(recipients);
  } catch (error) {
    return handleError(error, 'Failed to load notification settings');
  }
}

/**
 * PUT /api/admin/private-dining-notifications
 */
export async function PUT(req: NextRequest) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    assertResendFromEnvIfConfigured();
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const rawList = Array.isArray(body.emails) ? body.emails : [];
    const desiredRaw = rawList.map((e: unknown) => (typeof e === 'string' ? e : String(e)));

    const before = await listStaffRecipientsForAdmin();
    const recipients = await syncStaffRecipientsFromDesiredList(desiredRaw);

    const fmt = (r: (typeof before)[0]) =>
      `${r.email} (${r.status}${r.active ? '' : ', alerts off'})`;
    const summaryBefore = before.map(fmt).join(', ') || '(none)';
    const summaryAfter = recipients.map(fmt).join(', ') || '(none)';

    await logActivity(
      user.id,
      'update',
      'setting',
      'private-dining-notifications',
      'Private dining notification recipients',
      {
        recipients: {
          before: summaryBefore,
          after: summaryAfter,
        },
      },
      'Updated private dining notification recipients'
    );

    return jsonResponse(recipients);
  } catch (error) {
    return handleError(error, 'Failed to save notification settings');
  }
}

/**
 * PATCH /api/admin/private-dining-notifications
 * Body: { email: string, active: boolean } — enable or disable lead-alert emails for one address.
 */
export async function PATCH(req: NextRequest) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    assertResendFromEnvIfConfigured();
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email : '';
    const active = Boolean(body.active);

    const updated = await updateStaffRecipientActive(email, active);
    if (!updated) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    await logActivity(
      user.id,
      'update',
      'setting',
      'private-dining-notifications',
      'Private dining notification recipients',
      {
        recipient: {
          before: email.trim(),
          after: `${email.trim()} (alerts ${active ? 'on' : 'off'})`,
        },
      },
      `Set private dining email alerts ${active ? 'on' : 'off'} for ${email.trim()}`
    );

    return jsonResponse(updated);
  } catch (error) {
    return handleError(error, 'Failed to update recipient');
  }
}

/**
 * DELETE /api/admin/private-dining-notifications
 * Body: { email: string } — remove this address from the list entirely.
 */
export async function DELETE(req: NextRequest) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const raw = typeof body.email === 'string' ? body.email : '';
    const emails = normalizeEmailList([raw]);
    const email = emails[0];
    if (!email) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const existing = await prisma.privateDiningNotificationRecipient.findUnique({
      where: { email },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    await prisma.privateDiningNotificationRecipient.delete({
      where: { email },
    });

    await logActivity(
      user.id,
      'delete',
      'setting',
      existing.id,
      email,
      undefined,
      `Removed ${email} from private dining notification recipients`
    );

    await migrateLegacyNotificationRecipientsIfNeeded();
    const recipients = await listStaffRecipientsForAdmin();
    return jsonResponse(recipients);
  } catch (error) {
    return handleError(error, 'Failed to remove recipient');
  }
}
