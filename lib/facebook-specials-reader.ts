import { prisma } from '@/lib/prisma';
import { facebookPageTarget, normalizeVisitorCookie, type PublicFacebookPost } from '@/lib/facebook-public-page';
import { fetchVisitorFacebookPosts } from '@/lib/facebook-visitor';

const READER_KEY = 'facebook_specials_reader';
const VISITOR_KEY = 'facebook_visitor_session';
const GRAPH = 'https://graph.facebook.com/v18.0';

export interface SpecialsReader {
  facebookUserId: string;
  name: string;
  userAccessToken: string;
  expiresAt: string | null;
  pageId: string | null;
  pageAccessToken: string | null;
  connectedAt: string;
}

export function oauthQueryValue(search: string, key: string): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  for (const part of query.split('&')) {
    const eq = part.indexOf('=');
    const rawKey = eq === -1 ? part : part.slice(0, eq);
    let decodedKey = rawKey;
    try {
      decodedKey = decodeURIComponent(rawKey);
    } catch {
      decodedKey = rawKey;
    }
    if (decodedKey !== key) continue;
    const rawValue = eq === -1 ? '' : part.slice(eq + 1);
    try {
      return decodeURIComponent(rawValue.replace(/\+/g, '%2B'));
    } catch {
      return rawValue;
    }
  }
  return null;
}

export function facebookOAuthRedirectUri(): string {
  const origin = (process.env.NEXTAUTH_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
  return `${origin}/api/social/facebook/callback`;
}

export function specialsLoginUrl(userId: string | undefined): string | null {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return null;
  const state = Buffer.from(JSON.stringify({ userId, purpose: 'specials' })).toString('base64url');
  const url = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', facebookOAuthRedirectUri());
  url.searchParams.set('scope', 'pages_show_list,pages_read_engagement');
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

export async function loadSpecialsReader(): Promise<SpecialsReader | null> {
  const setting = await prisma.setting.findUnique({ where: { key: READER_KEY } });
  if (!setting?.value) return null;
  try {
    const parsed = JSON.parse(setting.value) as Partial<SpecialsReader>;
    if (!parsed.userAccessToken || !parsed.name || !parsed.facebookUserId) return null;
    return {
      facebookUserId: parsed.facebookUserId,
      name: parsed.name,
      userAccessToken: parsed.userAccessToken,
      expiresAt: parsed.expiresAt ?? null,
      pageId: parsed.pageId ?? null,
      pageAccessToken: parsed.pageAccessToken ?? null,
      connectedAt: parsed.connectedAt || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearSpecialsReader(): Promise<void> {
  await prisma.setting.deleteMany({ where: { key: { in: [READER_KEY, VISITOR_KEY] } } });
}

export async function loadVisitorLogin(): Promise<{ savedAt: string } | null> {
  const saved = await readVisitorSession();
  return saved ? { savedAt: saved.savedAt } : null;
}

export async function saveVisitorLogin(rawCookie: string): Promise<boolean> {
  const cookie = normalizeVisitorCookie(rawCookie);
  if (!cookie) return false;
  const value = JSON.stringify({ cookie, savedAt: new Date().toISOString() });
  await prisma.setting.upsert({
    where: { key: VISITOR_KEY },
    update: { value, description: 'Normal Facebook login used to read the specials page' },
    create: {
      key: VISITOR_KEY,
      value,
      description: 'Normal Facebook login used to read the specials page',
    },
  });
  return true;
}

async function readVisitorSession(): Promise<{ cookie: string; savedAt: string } | null> {
  const setting = await prisma.setting.findUnique({ where: { key: VISITOR_KEY } });
  if (!setting?.value) return null;
  try {
    const parsed = JSON.parse(setting.value) as { cookie?: unknown; savedAt?: unknown };
    if (typeof parsed.cookie !== 'string' || typeof parsed.savedAt !== 'string') return null;
    if (!normalizeVisitorCookie(parsed.cookie)) return null;
    return { cookie: parsed.cookie, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export async function finishSpecialsFacebookLogin(input: {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
}): Promise<{ path: string }> {
  if (input.error || !input.code) {
    return { path: `/admin/facebook-specials?error=${encodeURIComponent(loginError(input))}` };
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    return { path: `/admin/facebook-specials?error=${encodeURIComponent('Facebook App ID and Secret are not set.')}` };
  }

  const redirectUri = facebookOAuthRedirectUri();
  const shortLived = await exchangeFacebookCode(appId, appSecret, redirectUri, input.code);
  const shortToken = stringField(shortLived, 'access_token');
  if (!shortToken) {
    return { path: `/admin/facebook-specials?error=${encodeURIComponent(graphMessage(shortLived, 'Facebook did not return a login.'))}` };
  }

  const longLived = await graphGet('oauth/access_token', null, {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  const userToken = stringField(longLived, 'access_token');
  if (!userToken) {
    return { path: `/admin/facebook-specials?error=${encodeURIComponent(graphMessage(longLived, 'Facebook did not return a lasting login.'))}` };
  }

  const me = await graphGet('me', userToken, { fields: 'id,name' });
  const facebookUserId = stringField(me, 'id');
  if (!facebookUserId) {
    return { path: `/admin/facebook-specials?error=${encodeURIComponent(graphMessage(me, 'Facebook did not return the account name.'))}` };
  }

  const expiresIn = typeof longLived.expires_in === 'number' ? longLived.expires_in : null;
  await saveReader({
    facebookUserId,
    name: stringField(me, 'name') || 'Facebook account',
    userAccessToken: userToken,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    pageId: null,
    pageAccessToken: null,
    connectedAt: new Date().toISOString(),
  });

  return { path: '/admin/facebook-specials?connected=1' };
}

export interface ManagedPage {
  id: string;
  name: string;
  accessToken: string;
  username: string | null;
}

export function chooseManagedPage(pages: ManagedPage[], pageUrl: string):
  | { ok: true; page: ManagedPage }
  | { ok: false; reason: string } {
  if (pages.length === 0) {
    return {
      ok: false,
      reason: 'This Facebook account does not manage any pages. Connect an admin of the page, and choose that page when Facebook asks.',
    };
  }

  const target = facebookPageTarget(pageUrl);
  const byId = target.id ? pages.find((page) => page.id === target.id) : undefined;
  if (byId) return { ok: true, page: byId };

  const hint = pageNameHint(pageUrl);
  const wanted = hint ? looseName(hint) : '';
  const slug = target.slug ? looseName(target.slug) : '';
  const named = pages.filter((page) => pageMatches(page, wanted, slug));
  if (named.length === 1) return { ok: true, page: named[0] };
  if (named.length > 1) {
    return { ok: false, reason: `Several managed pages match that URL: ${pageList(named)}. Disconnect and connect the Monaghan's page only.` };
  }

  return {
    ok: false,
    reason: `This Facebook account manages ${pageList(pages)}, not the pasted page. Connect an admin of that page.`,
  };
}

export async function readSpecialsPage(pageUrl: string, limits?: { posts?: number; stories?: number }): Promise<
  | { ok: true; posts: PublicFacebookPost[]; storiesNote: string | null }
  | { ok: false; reason: string }
> {
  const visitor = await readVisitorSession();
  if (!visitor) {
    return {
      ok: false,
      reason: 'Save a normal Facebook login on the Facebook specials page. Paste the cookie from a facebook.com request while you are logged in.',
    };
  }

  const read = await fetchVisitorFacebookPosts(pageUrl, visitor.cookie);
  if (!read.ok) return read;
  const postLimit = limits?.posts ?? 10;
  return { ok: true, posts: read.posts.slice(0, postLimit), storiesNote: null };
}

async function saveReader(reader: SpecialsReader): Promise<void> {
  const value = JSON.stringify(reader);
  await prisma.setting.upsert({
    where: { key: READER_KEY },
    update: { value, description: 'Facebook account that reads the page for specials' },
    create: {
      key: READER_KEY,
      value,
      description: 'Facebook account that reads the page for specials',
    },
  });
}

function pageNameHint(pageUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const last = decodeURIComponent(parts[parts.length - 1] || '');
  const target = facebookPageTarget(pageUrl);
  const withoutId = target.id ? last.replace(new RegExp(`${target.id}$`), '').replace(/[-_]+$/, '') : last;
  const hint = withoutId.replace(/[-_]+/g, ' ').trim();
  return hint && !['p', 'pages', 'people'].includes(hint.toLowerCase()) ? hint : null;
}

function pageMatches(page: ManagedPage, wanted: string, slug: string): boolean {
  const name = looseName(page.name);
  const username = page.username ? looseName(page.username) : '';
  return namesMatch(name, wanted) || namesMatch(username, wanted) || namesMatch(name, slug) || namesMatch(username, slug);
}

function namesMatch(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  return shorter.length >= 8 && longer.startsWith(shorter);
}

function looseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word && !['and', 'the', 'at', 'of'].includes(word))
    .join('');
}

function pageList(pages: ManagedPage[]): string {
  const names = pages.slice(0, 5).map((page) => page.name);
  const extra = pages.length > 5 ? `, and ${pages.length - 5} more` : '';
  return `${names.join(', ')}${extra}`;
}

async function exchangeFacebookCode(
  appId: string,
  appSecret: string,
  redirectUri: string,
  code: string
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  try {
    const response = await fetch(`${GRAPH}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json().catch(() => null);
    return data && typeof data === 'object' ? data as Record<string, unknown> : {};
  } catch (error) {
    console.error('Facebook login code exchange failed:', error instanceof Error ? error.message : error);
    return { error: { message: 'Could not reach Facebook.' } };
  }
}

async function graphGet(path: string, token: string | null, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (token) url.searchParams.set('access_token', token);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const data = await response.json().catch(() => null);
    return data && typeof data === 'object' ? data as Record<string, unknown> : {};
  } catch (error) {
    console.error('Facebook specials request failed:', error instanceof Error ? error.message : error);
    return { error: { message: 'Could not reach Facebook.' } };
  }
}

function stringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' && field.trim() ? field.trim() : null;
}

function loginError(input: { error: string | null; errorDescription: string | null }): string {
  const description = input.errorDescription || '';
  if (input.error === 'access_denied') return 'Facebook login was canceled.';
  if (input.error === 'redirect_uri_mismatch' || /redirect/i.test(description)) {
    return 'The Facebook app needs this site’s callback address in its Valid OAuth Redirect URIs.';
  }
  if (/not accessible|app developer/i.test(description)) {
    return 'That Facebook account cannot use this app yet. In development mode, add the account as a tester, or switch the app to Live.';
  }
  return (description || input.error || 'Facebook login did not finish.').slice(0, 300);
}

function graphMessage(data: Record<string, unknown>, fallback: string): string {
  const error = data.error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim().slice(0, 300);
  }
  return fallback;
}
