import { NextResponse, type NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';
import { logLoginActivity } from '@/lib/api-helpers';
import { verifyEmailLogin } from '@/lib/email-login-link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export async function GET(req: NextRequest) {
  const verified = verifyEmailLogin(req.nextUrl.searchParams.get('token') || '');
  const loginUrl = new URL('/admin/login', req.nextUrl.origin);
  loginUrl.searchParams.set('error', 'link');
  if (!verified || !process.env.NEXTAUTH_SECRET) {
    return NextResponse.redirect(loginUrl);
  }

  const user = await prisma.user.findFirst({
    where: { id: verified.userId, isActive: true, role: { in: ['admin', 'owner'] } },
  });
  if (!user) return NextResponse.redirect(loginUrl);

  const sessionToken = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
    },
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: SESSION_MAX_AGE,
  });

  await logLoginActivity(user.id, user.email, user.name);
  const response = NextResponse.redirect(new URL(verified.nextPath, req.nextUrl.origin));
  const secure = (process.env.NEXTAUTH_URL || '').startsWith('https://');
  response.cookies.set(secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
