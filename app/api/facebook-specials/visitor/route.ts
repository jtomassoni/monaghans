import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { clearSpecialsReader, saveVisitorLogin } from '@/lib/facebook-specials-reader';

export const dynamic = 'force-dynamic';

async function allowed(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const permissions = getPermissions(session?.user?.role);
  return Boolean(session?.user && (permissions.canManageMenu || permissions.canAccessAdmin));
}

export async function POST(req: Request) {
  if (!(await allowed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const cookie = body && typeof body.cookie === 'string' ? body.cookie : '';
  const saved = await saveVisitorLogin(cookie);
  if (!saved) {
    return NextResponse.json(
      { error: 'Paste the cookie from a facebook.com request. It needs c_user and xs.' },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await allowed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await clearSpecialsReader();
  return NextResponse.json({ ok: true });
}
