import { createHmac, timingSafeEqual } from 'crypto';

const LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function signEmailLogin(userId: string, nextPath: string): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  const path = safeAdminPath(nextPath);
  if (!secret || !userId || !path) return null;
  const payload = Buffer.from(
    JSON.stringify({ userId, nextPath: path, exp: Date.now() + LINK_TTL_MS })
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyEmailLogin(token: string): { userId: string; nextPath: string } | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || !token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      userId?: unknown;
      nextPath?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.userId !== 'string' || typeof parsed.nextPath !== 'string') return null;
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    const path = safeAdminPath(parsed.nextPath);
    if (!path) return null;
    return { userId: parsed.userId, nextPath: path };
  } catch {
    return null;
  }
}

export function safeAdminPath(path: string): string | null {
  if (!path.startsWith('/admin/') || path.startsWith('//') || path.includes('\\')) return null;
  if (path.includes('://')) return null;
  return path;
}

export function emailLoginUrl(userId: string, nextPath: string): string | null {
  const token = signEmailLogin(userId, nextPath);
  const site = (process.env.NEXTAUTH_URL || '').trim().replace(/\/$/, '');
  if (!token || !site) return null;
  return `${site}/api/private-dining/email-login?token=${encodeURIComponent(token)}`;
}
