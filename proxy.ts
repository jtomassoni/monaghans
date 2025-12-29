import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Allow access to login page without auth
  if (pathname === '/admin/login') {
    // If already logged in with valid token, redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // Allow access to login page and set a header to identify it
    const response = NextResponse.next();
    response.headers.set('x-is-login-page', 'true');
    return response;
  }

  // Protect all other admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      // No token or expired token - redirect to login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};




