import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { getPageAccessToken } from '@/lib/facebook-helpers';
import { parseFacebookFoodSpecial } from '@/lib/parse-facebook-food-special';
import { logActivity } from '@/lib/api-helpers';
import {
  getCompanyTimezone,
  getCompanyTimezoneDateString,
  parseAnyDateAsMountainTime,
} from '@/lib/timezone';

const LOOKBACK_MS = 36 * 60 * 60 * 1000;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_NOTIFY_EMAIL = 'jtomassoni@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FacebookFoodSpecialImportRecord {
  id: string;
  facebookPostId: string;
  permalink: string | null;
  imageUrl: string | null;
  rawMessage: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  postedAt: Date;
  status: string;
  specialId: string | null;
}

export function foodSpecialNotifyEmails(): string[] {
  const raw = process.env.FOOD_SPECIAL_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_EMAIL;
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(',')) {
    const email = part.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function signFoodSpecialImport(id: string): string {
  const secret = requireSecret();
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${id}~${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}~${sig}`;
}

export function verifyFoodSpecialImportToken(token: string): { id: string } | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const parts = token.split('~');
  if (parts.length !== 3) return null;
  const [id, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!id || !sig || !Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = createHmac('sha256', secret).update(`${id}~${exp}`).digest('base64url');
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }
  return { id };
}

export async function loadFoodSpecialImport(token: string): Promise<FacebookFoodSpecialImportRecord | null> {
  const verified = verifyFoodSpecialImportToken(token);
  if (!verified) return null;
  return prisma.facebookFoodSpecialImport.findUnique({ where: { id: verified.id } });
}

export async function pollFacebookForFoodSpecials(): Promise<{
  ok: boolean;
  reason?: string;
  checked: number;
  emailed: number;
}> {
  const connection = await loadFacebookConnection();
  if (!connection) {
    return { ok: false, reason: 'Facebook is not connected', checked: 0, emailed: 0 };
  }

  const posts = await fetchRecentPagePosts(connection);
  let emailed = 0;

  for (const post of posts) {
    const message = (post.message || '').trim();
    if (!message) continue;

    const existing = await prisma.facebookFoodSpecialImport.findUnique({
      where: { facebookPostId: post.id },
    });
    if (existing?.notifiedAt || existing?.status === 'applied' || existing?.status === 'dismissed') {
      continue;
    }

    const postedByApp = await prisma.facebookPost.findUnique({
      where: { postId: post.id },
      select: { id: true },
    });
    if (postedByApp) continue;

    const parsed = parseFacebookFoodSpecial(message);
    if (!parsed) continue;

    const postedAt = post.created_time ? new Date(post.created_time) : new Date();
    const row =
      existing ??
      (await createImport({
        facebookPostId: post.id,
        permalink: post.permalink_url || null,
        imageUrl: post.full_picture || null,
        rawMessage: message,
        title: parsed.title,
        description: parsed.description,
        priceNotes: parsed.priceNotes,
        postedAt,
      }));

    if (!row) continue;

    const sent = await sendFoodSpecialReadyEmail(row);
    if (sent) {
      await prisma.facebookFoodSpecialImport.update({
        where: { id: row.id },
        data: { notifiedAt: new Date() },
      });
      emailed += 1;
    }
  }

  return { ok: true, checked: posts.length, emailed };
}

export async function applyFacebookFoodSpecialImport(input: {
  token: string;
  title: string;
  description: string;
  priceNotes: string;
}): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  const row = await loadFoodSpecialImport(input.token);
  if (!row) return { ok: false, error: 'This link is invalid or expired.' };
  if (row.status === 'applied') return { ok: true, already: true };
  if (row.status === 'dismissed') {
    return { ok: false, error: 'This post was skipped. It was not added.' };
  }

  const title = input.title.trim();
  if (title.length < 2 || title.length > 120) {
    return { ok: false, error: 'Add a name for the special.' };
  }

  const description = blankToNull(input.description, 2000);
  const priceNotes = blankToNull(input.priceNotes, 80);
  const timezone = await getCompanyTimezone();
  const dateStr = getCompanyTimezoneDateString(row.postedAt, timezone);
  const day = parseAnyDateAsMountainTime(dateStr);
  if (!day) return { ok: false, error: 'Could not read the day of that Facebook post.' };

  const special = await prisma.special.create({
    data: {
      title,
      description,
      priceNotes,
      type: 'food',
      appliesOn: null,
      startDate: day,
      endDate: day,
      isActive: true,
    },
  });

  await prisma.facebookFoodSpecialImport.update({
    where: { id: row.id },
    data: {
      status: 'applied',
      specialId: special.id,
      title,
      description,
      priceNotes,
    },
  });

  const actor = await prisma.user.findFirst({
    where: { isActive: true, role: 'admin' },
    select: { id: true },
  });
  if (actor) {
    await logActivity(
      actor.id,
      'create',
      'special',
      special.id,
      special.title,
      undefined,
      `added food special "${special.title}" from a Facebook post`
    );
  }

  return { ok: true, already: false };
}

export async function dismissFacebookFoodSpecialImport(
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await loadFoodSpecialImport(token);
  if (!row) return { ok: false, error: 'This link is invalid or expired.' };
  if (row.status === 'applied') return { ok: false, error: 'This special was already added.' };
  if (row.status !== 'dismissed') {
    await prisma.facebookFoodSpecialImport.update({
      where: { id: row.id },
      data: { status: 'dismissed' },
    });
  }
  return { ok: true };
}

function requireSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required to sign food-special links');
  return secret;
}

function blankToNull(value: string, max: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function siteBase(): string {
  const explicit = (process.env.NEXTAUTH_URL || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildFoodSpecialReviewEmail(input: {
  row: FacebookFoodSpecialImportRecord;
  link: string;
  postedLabel: string;
}): { subject: string; text: string; html: string } {
  const { row, link, postedLabel } = input;
  const description = row.description?.trim() || '(none)';
  const price = row.priceNotes?.trim() || '(none)';
  const subject = `Food special ready: ${row.title}`;

  const text = [
    `A Facebook post is ready to review.`,
    ``,
    `Full post`,
    `Posted: ${postedLabel}`,
    row.permalink || '(no Facebook link)',
    row.imageUrl ? `Photo: ${row.imageUrl}` : 'Photo: (none)',
    ``,
    row.rawMessage,
    ``,
    `What the parser pulled out`,
    `Name: ${row.title}`,
    `Description: ${description}`,
    `Price: ${price}`,
    ``,
    `Add it for that day: ${link}`,
  ].join('\n');

  const html = `
    <p style="margin:0 0 16px;">A Facebook post is ready to review.</p>
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">Full post</p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Posted ${escapeHtml(postedLabel)}</p>
    ${row.imageUrl ? `<p style="margin:0 0 12px;"><img src="${escapeHtml(row.imageUrl)}" alt="" style="max-width:100%;border-radius:10px;" /></p>` : '<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Photo: (none)</p>'}
    <p style="margin:0;padding:12px 14px;background:#f9fafb;border-radius:10px;white-space:pre-wrap;color:#111827;">${escapeHtml(row.rawMessage)}</p>
    ${row.permalink ? `<p style="margin:12px 0 0;font-size:13px;"><a href="${escapeHtml(row.permalink)}">View on Facebook</a></p>` : '<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">No Facebook link</p>'}
    <p style="margin:22px 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">What the parser pulled out</p>
    <p style="margin:0 0 4px;"><strong>Name:</strong> ${escapeHtml(row.title)}</p>
    <p style="margin:0 0 4px;"><strong>Description:</strong> ${escapeHtml(description)}</p>
    <p style="margin:0 0 16px;"><strong>Price:</strong> ${escapeHtml(price)}</p>
    <p style="margin:0;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Add this food special</a></p>
  `;

  return { subject, text, html };
}

async function sendFoodSpecialReadyEmail(row: FacebookFoodSpecialImportRecord): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const to = foodSpecialNotifyEmails();
  const base = siteBase();
  if (!apiKey || !from || to.length === 0 || !base) {
    console.error('Food special email skipped. Set RESEND_API_KEY, RESEND_FROM, and NEXTAUTH_URL.');
    return false;
  }

  const link = `${base}/food-specials/import/${signFoodSpecialImport(row.id)}`;
  const timezone = await getCompanyTimezone();
  const postedLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(row.postedAt);
  const { subject, text, html } = buildFoodSpecialReviewEmail({ row, link, postedLabel });

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, text, html });
    if (error) {
      console.error('Food special email failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Food special email failed:', error);
    return false;
  }
}

interface FacebookConnection {
  pageId: string;
  accessToken: string;
  userAccessToken?: string;
}

async function loadFacebookConnection(): Promise<FacebookConnection | null> {
  const setting = await prisma.setting.findUnique({ where: { key: 'facebook_connection' } });
  if (!setting) return null;
  let data: {
    connected?: boolean;
    pageId?: string;
    accessToken?: string;
    userAccessToken?: string;
    expiresAt?: string;
  };
  try {
    data = JSON.parse(setting.value);
  } catch {
    return null;
  }
  if (!data.connected || !data.pageId || !data.accessToken) return null;
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    throw new Error('Facebook connection expired. Reconnect the page in Settings.');
  }

  let accessToken = data.accessToken;
  if (data.userAccessToken) {
    try {
      accessToken = await getPageAccessToken(data.userAccessToken, data.pageId);
    } catch (error) {
      console.warn('Using the stored Facebook page token:', error);
    }
  }
  return { pageId: data.pageId, accessToken, userAccessToken: data.userAccessToken };
}

interface GraphPost {
  id: string;
  message?: string;
  permalink_url?: string;
  full_picture?: string;
  created_time?: string;
}

async function fetchRecentPagePosts(connection: FacebookConnection): Promise<GraphPost[]> {
  const since = Math.floor((Date.now() - LOOKBACK_MS) / 1000);
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${connection.pageId}/posts?` +
      `fields=id,message,permalink_url,full_picture,created_time&limit=15&since=${since}` +
      `&access_token=${encodeURIComponent(connection.accessToken)}`
  );
  const data = await response.json();
  if (!response.ok || data.error) {
    const message = data.error?.message || response.statusText;
    throw new Error(`Facebook posts could not be read: ${message}`);
  }
  return Array.isArray(data.data) ? data.data : [];
}

async function createImport(data: {
  facebookPostId: string;
  permalink: string | null;
  imageUrl: string | null;
  rawMessage: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  postedAt: Date;
}): Promise<FacebookFoodSpecialImportRecord | null> {
  try {
    return await prisma.facebookFoodSpecialImport.create({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.facebookFoodSpecialImport.findUnique({
        where: { facebookPostId: data.facebookPostId },
      });
    }
    throw error;
  }
}
