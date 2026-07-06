import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleError } from '@/lib/api-helpers';
import { getPermissions } from '@/lib/permissions';
import {
  getOrderingRedirectAnalytics,
  ORDERING_REDIRECT_PATHS,
} from '@/lib/ordering-redirect-tracking';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessReporting) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const role = session.user.role;
  if (role !== 'admin' && role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = Math.min(365, Math.max(1, parseInt(searchParams.get('period') || '30', 10)));

    const analytics = await getOrderingRedirectAnalytics(period);

    return NextResponse.json({
      ...analytics,
      links: ORDERING_REDIRECT_PATHS,
      note:
        'Counts visitors who hit each redirect link on your site. Toast does not report orders back to us, so completed orders cannot be attributed per link.',
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch ordering redirect analytics');
  }
}
