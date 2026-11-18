import { prisma } from '@/lib/prisma';
import { facebookPageTarget, type PublicFacebookPost } from '@/lib/facebook-public-page';

const READER_KEY = 'facebook_specials_reader';
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

export function facebookOAuthRedirectUri(): string {
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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
  await prisma.setting.deleteMany({ where: { key: READER_KEY } });
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
  const shortLived = await graphGet('oauth/access_token', null, {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code: input.code,
  });
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

export async function readSpecialsPage(pageUrl: string, limits?: { posts?: number; stories?: number }): Promise<
  | { ok: true; posts: PublicFacebookPost[]; storiesNote: string | null }
  | { ok: false; reason: string }
> {
  const reader = await loadSpecialsReader();
  if (!reader) {
    return { ok: false, reason: 'Connect a Facebook account on the Facebook specials page.' };
  }

  const target = facebookPageTarget(pageUrl);
  const pageId = target.id || (target.slug ? await resolveSlug(target.slug, reader.userAccessToken) : null);
  if (!pageId) {
    return { ok: false, reason: 'Could not find a Facebook page at that URL.' };
  }

  const userExpired = reader.expiresAt ? Date.parse(reader.expiresAt) < Date.now() : false;
  let token = reader.pageId === pageId ? reader.pageAccessToken : null;
  if (!token) {
    if (userExpired) {
      return { ok: false, reason: 'The Facebook login expired. Connect the account again.' };
    }
    token = reader.userAccessToken;
  }

  const postLimit = limits?.posts ?? 10;
  const storyLimit = limits?.stories ?? 5;
  let posts = await graphPosts(pageId, token, postLimit);
  if (!posts.ok && reader.userAccessToken && !userExpired) {
    const pageToken = await pageTokenFor(reader, pageId);
    if (pageToken) {
      token = pageToken;
      posts = await graphPosts(pageId, pageToken, postLimit);
    }
  }
  if (!posts.ok) return posts;

  const stories = await graphStories(pageId, token, storyLimit);
  return {
    ok: true,
    posts: [...posts.posts, ...stories.posts],
    storiesNote: stories.note,
  };
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

async function resolveSlug(slug: string, token: string): Promise<string | null> {
  const data = await graphGet(encodeURIComponent(slug), token, { fields: 'id' });
  return stringField(data, 'id');
}

async function pageTokenFor(reader: SpecialsReader, pageId: string): Promise<string | null> {
  const accounts = await graphGet('me/accounts', reader.userAccessToken, {
    fields: 'id,access_token',
    limit: '50',
  });
  const pages = Array.isArray(accounts.data) ? accounts.data : [];
  const match = pages.find((page) => page && typeof page === 'object' && (page as { id?: string }).id === pageId) as
    | { access_token?: string }
    | undefined;
  const pageToken = match?.access_token;
  if (!pageToken) return null;
  await saveReader({ ...reader, pageId, pageAccessToken: pageToken });
  return pageToken;
}

async function graphPosts(pageId: string, token: string, limit: number): Promise<
  | { ok: true; posts: PublicFacebookPost[] }
  | { ok: false; reason: string }
> {
  const data = await graphGet(`${pageId}/posts`, token, {
    fields: 'id,message,created_time,permalink_url,full_picture',
    limit: String(limit),
  });
  if (data.error) return { ok: false, reason: graphMessage(data, 'Facebook refused the page.') };
  const rows = Array.isArray(data.data) ? data.data : [];
  return { ok: true, posts: rows.flatMap((row) => toPost(row, 'Text read from the photo')) };
}

async function graphStories(pageId: string, token: string, limit: number): Promise<{ posts: PublicFacebookPost[]; note: string | null }> {
  const data = await graphGet(`${pageId}/stories`, token, {
    fields: 'id,creation_time,media_type,url,status',
    limit: String(limit),
  });
  if (data.error) {
    return { posts: [], note: `Stories were not included: ${graphMessage(data, 'Facebook did not return stories.')}` };
  }
  const rows = Array.isArray(data.data) ? data.data : [];
  let videos = 0;
  const posts: PublicFacebookPost[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const mediaType = stringField(row, 'media_type');
    const image = directImage(stringField(row, 'url'));
    if (mediaType === 'VIDEO' && !image) {
      videos += 1;
      continue;
    }
    const post = toPost(row, 'Text read from the story')[0];
    if (post) posts.push(post);
  }
  const note = videos > 0
    ? `${videos} video ${videos === 1 ? 'story had' : 'stories had'} no still image.`
    : null;
  return { posts, note };
}

function toPost(row: unknown, imageLabel: string): PublicFacebookPost[] {
  if (!row || typeof row !== 'object') return [];
  const id = stringField(row, 'id');
  if (!id) return [];
  return [{
    id,
    message: stringField(row, 'message') || '',
    permalink: stringField(row, 'permalink_url') || stringField(row, 'url'),
    imageUrl: directImage(stringField(row, 'full_picture') || stringField(row, 'url')),
    createdTime: stringField(row, 'created_time') || stringField(row, 'creation_time'),
    imageLabel,
  }];
}

function directImage(url: string | null): string | null {
  if (!url) return null;
  return /fbcdn\.net|scontent/i.test(url) ? url : null;
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
