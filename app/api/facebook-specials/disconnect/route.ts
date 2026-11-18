import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { clearSpecialsReader } from '@/lib/facebook-specials-reader';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const permissions = getPermissions(session?.user?.role);
  if (!session?.user || (!permissions.canManageMenu && !permissions.canAccessAdmin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await clearSpecialsReader();
  return NextResponse.json({ ok: true });
}
