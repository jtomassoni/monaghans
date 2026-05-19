import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';

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
 * POST /api/private-dining-leads/acknowledge
 * Body: { leadIds: string[] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const userId = auth.session.user.id as string;

  try {
    const body = await req.json();
    const leadIds = body?.leadIds;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array required' }, { status: 400 });
    }

    const uniqueIds = [...new Set(leadIds.filter((id: unknown) => typeof id === 'string' && id.length > 0))];
    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: 'No valid lead ids' }, { status: 400 });
    }

    await prisma.privateDiningLeadAcknowledgment.createMany({
      data: uniqueIds.map((leadId) => ({ userId, leadId })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[acknowledge]', e);
    return NextResponse.json({ error: 'Failed to acknowledge' }, { status: 500 });
  }
}
