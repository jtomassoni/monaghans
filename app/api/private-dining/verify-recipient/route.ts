import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffRecipientAndWelcome } from '@/lib/private-dining-notifications';

function verifiedUrl(req: NextRequest, query: Record<string, string>): URL {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    req.nextUrl.origin;
  const u = new URL('/private-dining-notifications/verified', base);
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, v);
  }
  return u;
}

/**
 * GET /api/private-dining/verify-recipient?token=...
 * Public link from staff verification email; redirects to a simple confirmation page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';

  const result = await verifyStaffRecipientAndWelcome(token);

  if (result === 'ok') {
    return NextResponse.redirect(verifiedUrl(req, {}));
  }
  if (result === 'expired') {
    return NextResponse.redirect(verifiedUrl(req, { error: 'expired' }));
  }
  return NextResponse.redirect(verifiedUrl(req, { error: 'invalid' }));
}
