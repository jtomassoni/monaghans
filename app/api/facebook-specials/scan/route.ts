import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { scanFacebookSpecialsLastDay } from '@/lib/facebook-food-special-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  const session = await getServerSession(authOptions);
  const permissions = getPermissions(session?.user?.role);
  if (!session?.user || (!permissions.canManageMenu && !permissions.canAccessAdmin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await scanFacebookSpecialsLastDay();
  return NextResponse.json(result);
}
