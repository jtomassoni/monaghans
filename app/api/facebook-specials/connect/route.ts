import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { specialsLoginUrl } from '@/lib/facebook-specials-reader';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  const permissions = getPermissions(session?.user?.role);
  if (!session?.user || (!permissions.canManageMenu && !permissions.canAccessAdmin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return NextResponse.json({ error: 'Facebook App ID and Secret are not set.' }, { status: 500 });
  }
  const authUrl = specialsLoginUrl(session.user.id);
  if (!authUrl) {
    return NextResponse.json({ error: 'Facebook login could not be started.' }, { status: 500 });
  }
  return NextResponse.json({ authUrl });
}
