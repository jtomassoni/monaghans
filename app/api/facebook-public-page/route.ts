import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';
import {
  FACEBOOK_PUBLIC_PAGE_KEY,
  normalizeFacebookPageUrl,
} from '@/lib/facebook-public-page';

export const dynamic = 'force-dynamic';

async function requireMenuAccess() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = getPermissions(role);
  if (!permissions.canManageMenu && !permissions.canAccessAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireMenuAccess();
  if (denied) return denied;
  const setting = await prisma.setting.findUnique({ where: { key: FACEBOOK_PUBLIC_PAGE_KEY } });
  return NextResponse.json({ url: setting?.value || '' });
}

export async function PUT(req: NextRequest) {
  const denied = await requireMenuAccess();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const raw = String(body.url || '').trim();
  if (!raw) {
    await prisma.setting.deleteMany({ where: { key: FACEBOOK_PUBLIC_PAGE_KEY } });
    return NextResponse.json({ url: '' });
  }
  const url = normalizeFacebookPageUrl(raw);
  if (!url) {
    return NextResponse.json(
      { error: 'Paste a public facebook.com page URL.' },
      { status: 400 }
    );
  }
  await prisma.setting.upsert({
    where: { key: FACEBOOK_PUBLIC_PAGE_KEY },
    update: { value: url, description: 'Public Facebook page the specials check reads' },
    create: {
      key: FACEBOOK_PUBLIC_PAGE_KEY,
      value: url,
      description: 'Public Facebook page the specials check reads',
    },
  });
  return NextResponse.json({ url });
}
