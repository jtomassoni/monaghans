import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';

const MAX_PENDING = 40;
const LOOKBACK_DAYS = 365;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { session };
}

/**
 * GET /api/private-dining-leads/pending-acknowledgment
 * Leads this user has not yet acknowledged (new submissions they must dismiss).
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const userId = auth.session.user.id as string;
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  try {
    const acknowledged = await prisma.privateDiningLeadAcknowledgment.findMany({
      where: { userId },
      select: { leadId: true },
    });
    const ackIds = acknowledged.map((a) => a.leadId);

    const leads = await prisma.privateDiningLead.findMany({
      where: {
        ...(ackIds.length > 0 ? { id: { notIn: ackIds } } : {}),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_PENDING,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        groupSize: true,
        preferredDate: true,
        status: true,
        createdAt: true,
      },
    });

    const serialized = leads.map((lead) => ({
      ...lead,
      preferredDate: lead.preferredDate.toISOString(),
      createdAt: lead.createdAt.toISOString(),
    }));

    return NextResponse.json({ leads: serialized });
  } catch (e) {
    console.error('[pending-acknowledgment]', e);
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 });
  }
}
