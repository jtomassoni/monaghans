import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { parseSpecialText, reviewMessage } from '@/lib/facebook-special-source';
import {
  FACEBOOK_PUBLIC_PAGE_KEY,
  fetchPublicFacebookPosts,
} from '@/lib/facebook-public-page';
import { readImageText } from '@/lib/read-image-text';
import {
  footballGameDescription,
  footballGameTitle,
  withFootballGameTags,
} from '@/lib/football-games';
import { findNflTeam } from '@/lib/nfl-teams';
import { logActivity } from '@/lib/api-helpers';
import {
  getCompanyTimezone,
  getCompanyTimezoneDateString,
  parseAnyDateAsMountainTime,
  parseDateTimeLocalAsCompanyTimezone,
} from '@/lib/timezone';

const LOOKBACK_MS = 36 * 60 * 60 * 1000;
const MAX_IMAGE_READS = 6;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_NOTIFY_EMAIL = 'jtomassoni@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FacebookFoodSpecialImportRecord {
  id: string;
  facebookPostId: string;
  permalink: string | null;
  imageUrl: string | null;
  rawMessage: string;
  kind: string;
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
  const pageUrl = await loadPublicPageUrl();
  if (!pageUrl) {
    return {
      ok: false,
      reason: 'Paste the public Facebook page URL on the Facebook specials page.',
      checked: 0,
      emailed: 0,
    };
  }

  const { posts, blocked } = await fetchPublicFacebookPosts(pageUrl);
  if (blocked) {
    return { ok: false, reason: 'Facebook did not return that public page.', checked: 0, emailed: 0 };
  }

  const timezone = await getCompanyTimezone();
  const seen = new Set<string>();
  let imageReads = 0;
  let emailed = 0;

  for (const post of posts) {
    const postedAt = post.createdTime ? new Date(post.createdTime) : new Date();
    if (Number.isNaN(postedAt.getTime())) continue;
    if (post.createdTime && Date.now() - postedAt.getTime() > LOOKBACK_MS) continue;
    const didEmail = await considerSpecial({
      timezone,
      seen,
      facebookPostId: post.id,
      permalink: post.permalink,
      imageUrl: post.imageUrl,
      caption: post.message.trim(),
      postedAt,
      imageLabel: post.imageLabel,
      imageReads: () => imageReads,
      useImageRead: () => {
        imageReads += 1;
      },
    });
    if (didEmail) emailed += 1;
  }

  return { ok: true, checked: posts.length, emailed };
}

async function loadPublicPageUrl(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: FACEBOOK_PUBLIC_PAGE_KEY } });
  const url = setting?.value?.trim();
  return url || null;
}

async function considerSpecial(input: {
  timezone: string;
  seen: Set<string>;
  facebookPostId: string;
  permalink: string | null;
  imageUrl: string | null;
  caption: string;
  postedAt: Date;
  imageLabel: string;
  imageReads: () => number;
  useImageRead: () => void;
}): Promise<boolean> {
  if (!input.facebookPostId || input.seen.has(input.facebookPostId)) return false;
  input.seen.add(input.facebookPostId);
  if (!input.caption && !input.imageUrl) return false;

  const existing = await prisma.facebookFoodSpecialImport.findUnique({
    where: { facebookPostId: input.facebookPostId },
  });
  if (existing?.notifiedAt || existing?.status === 'applied' || existing?.status === 'dismissed') {
    return false;
  }

  const postedByApp = await prisma.facebookPost.findUnique({
    where: { postId: input.facebookPostId },
    select: { id: true },
  });
  if (postedByApp) return false;

  let parsed = input.caption ? parseSpecialText(input.caption, input.postedAt, input.timezone) : null;
  let imageText: string | null = null;
  if (!parsed && input.imageUrl) {
    if (input.imageReads() >= MAX_IMAGE_READS) {
      console.warn('Photo text paused until the next hour. The image limit for this check was reached.');
      return false;
    }
    input.useImageRead();
    imageText = await readImageText(input.imageUrl);
    if (imageText) parsed = parseSpecialText(imageText, input.postedAt, input.timezone);
  }
  if (!parsed) return false;

  const football = parsed.kind === 'football' ? parsed.football : null;
  const food = parsed.kind === 'food' ? parsed.food : null;
  const row =
    existing ??
    (await createImport({
      facebookPostId: input.facebookPostId,
      permalink: input.permalink,
      imageUrl: input.imageUrl,
      rawMessage: reviewMessage({
        caption: input.caption,
        imageLabel: imageText ? input.imageLabel : null,
        imageText,
      }),
      kind: football ? 'football' : 'food',
      title: football
        ? football.opponent
          ? footballGameTitle(football.opponent)
          : 'Broncos Game'
        : food!.title,
      description: football ? football.houseMeal : food!.description,
      priceNotes: football ? football.kickoffLocal : food!.priceNotes,
      postedAt: input.postedAt,
    }));

  if (!row) return false;

  const sent = await sendFoodSpecialReadyEmail(row);
  if (!sent) return false;
  await prisma.facebookFoodSpecialImport.update({
    where: { id: row.id },
    data: { notifiedAt: new Date() },
  });
  return true;
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

  if (row.kind === 'football') {
    return applyFootballImport(row, { title, description, priceNotes, timezone });
  }

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

async function applyFootballImport(
  row: FacebookFoodSpecialImportRecord,
  input: {
    title: string;
    description: string | null;
    priceNotes: string | null;
    timezone: string;
  }
): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  const opponentName = findNflTeam(input.title)?.name ?? input.title;
  const houseMeal = input.description?.trim() || '';
  const kickoff = input.priceNotes?.trim() || '';
  if (!/^\d{4}-\d{2}-\d{2}T(?:11:00|14:00|18:00)$/.test(kickoff)) {
    return { ok: false, error: 'Kickoff is 11:00 AM, 2:00 PM, or 6:00 PM.' };
  }
  if (houseMeal.length < 2) {
    return { ok: false, error: 'Add what the house is providing for the pot luck.' };
  }

  const start = parseDateTimeLocalAsCompanyTimezone(kickoff, input.timezone);
  const end = new Date(start.getTime() + 3.5 * 60 * 60 * 1000);
  const eventTitle = footballGameTitle(opponentName);
  const event = await prisma.event.create({
    data: {
      title: eventTitle,
      description: footballGameDescription(houseMeal),
      startDateTime: start,
      endDateTime: end,
      venueArea: 'bar',
      isAllDay: false,
      tags: JSON.stringify(withFootballGameTags([], houseMeal)),
      isActive: true,
    },
  });

  await prisma.facebookFoodSpecialImport.update({
    where: { id: row.id },
    data: {
      status: 'applied',
      specialId: event.id,
      title: eventTitle,
      description: houseMeal,
      priceNotes: kickoff,
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
      'event',
      event.id,
      event.title,
      undefined,
      `added football game "${event.title}" from a Facebook post`
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
  const football = row.kind === 'football';
  const description = row.description?.trim() || '(none)';
  const price = row.priceNotes?.trim() || '(none)';
  const parsedLines = football
    ? [
        'Kind: Football special',
        `Opponent: ${footballOpponentDefault(row.title) || '(none)'}`,
        `House meal: ${description}`,
        `Kickoff: ${formatKickoff(price)}`,
      ]
    : [`Name: ${row.title}`, `Description: ${description}`, `Price: ${price}`];
  const subject = football ? `Football special ready: ${row.title}` : `Food special ready: ${row.title}`;
  const action = football ? 'Add this football game' : 'Add it for that day';

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
    ...parsedLines,
    ``,
    `${action}: ${link}`,
  ].join('\n');

  const html = `
    <p style="margin:0 0 16px;">A Facebook post is ready to review.</p>
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">Full post</p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Posted ${escapeHtml(postedLabel)}</p>
    ${row.imageUrl ? `<p style="margin:0 0 12px;"><img src="${escapeHtml(row.imageUrl)}" alt="" style="max-width:100%;border-radius:10px;" /></p>` : '<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Photo: (none)</p>'}
    <p style="margin:0;padding:12px 14px;background:#f9fafb;border-radius:10px;white-space:pre-wrap;color:#111827;">${escapeHtml(row.rawMessage)}</p>
    ${row.permalink ? `<p style="margin:12px 0 0;font-size:13px;"><a href="${escapeHtml(row.permalink)}">View on Facebook</a></p>` : '<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">No Facebook link</p>'}
    <p style="margin:22px 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">What the parser pulled out</p>
    ${parsedLines.map((line) => `<p style="margin:0 0 4px;">${escapeHtml(line)}</p>`).join('')}
    <p style="margin:16px 0 0;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">${escapeHtml(action)}</a></p>
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

export function footballOpponentDefault(title: string): string {
  const vs = title.match(/^broncos\s+vs\.?\s+(.+)$/i);
  if (vs) return vs[1].trim();
  if (/^broncos game$/i.test(title)) return '';
  return title;
}

function formatKickoff(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

async function createImport(data: {
  facebookPostId: string;
  permalink: string | null;
  imageUrl: string | null;
  rawMessage: string;
  kind: string;
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
