import { createHash } from 'crypto';

export const FACEBOOK_PUBLIC_PAGE_KEY = 'facebook_public_page_url';

export interface PublicFacebookPost {
  id: string;
  message: string;
  permalink: string | null;
  imageUrl: string | null;
  createdTime: string | null;
  imageLabel: string;
}

const BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export function facebookPageTarget(pageUrl: string): { id: string | null; slug: string | null } {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return { id: null, slug: null };
  }
  const idParam = url.searchParams.get('id');
  if (idParam && /^\d{5,}$/.test(idParam)) return { id: idParam, slug: null };
  const parts = url.pathname.split('/').filter(Boolean);
  const last = decodeURIComponent(parts[parts.length - 1] || '');
  const trailing = last.match(/(\d{8,})$/);
  if (trailing) return { id: trailing[1], slug: null };
  if (/^\d{5,}$/.test(last)) return { id: last, slug: null };
  if (last && !['p', 'pages', 'people'].includes(last.toLowerCase())) {
    return { id: null, slug: last };
  }
  return { id: null, slug: null };
}

export function normalizeFacebookPageUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'facebook.com' && host !== 'm.facebook.com' && host !== 'mbasic.facebook.com') {
    return null;
  }
  if (!url.pathname || url.pathname === '/') return null;
  url.hash = '';
  url.protocol = 'https:';
  return url.toString();
}

export function parsePublicFacebookHtml(html: string): PublicFacebookPost[] {
  if (!html || isFacebookBlock(html)) return [];
  const source = html.replace(/\\\//g, '/');
  const found = new Map<string, PublicFacebookPost>();

  const messagePattern = /"message"\s*:\s*\{\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  for (const match of source.matchAll(messagePattern)) {
    const message = decodeJsonString(match[1]);
    if (message.length < 8) continue;
    const around = source.slice(Math.max(0, (match.index || 0) - 2500), (match.index || 0) + 2500);
    addPost(found, message, around, 'Text read from the photo');
  }

  const chunks = source.split(/story_body_container|data-ft="/);
  for (const chunk of chunks) {
    if (!/story_fbid|\/posts\/|permalink\.php|story\.php/i.test(chunk)) continue;
    const message = visiblePostText(chunk);
    if (message.length < 8) continue;
    addPost(found, message, chunk, chunk.includes('/stories/') ? 'Text read from the story' : 'Text read from the photo');
  }

  const linkPattern = /href="([^"]*(?:story|permalink)\.php[^"]*)"/gi;
  for (const match of source.matchAll(linkPattern)) {
    const at = match.index || 0;
    const around = source.slice(Math.max(0, at - 1800), at + 1800);
    const message = visiblePostText(around);
    if (message.length < 8) continue;
    addPost(found, message, around, around.includes('/stories/') ? 'Text read from the story' : 'Text read from the photo');
  }

  return [...found.values()];
}

export function pageRequiresLogin(html: string): boolean {
  return /comet_loggedout_pkg|login_form|\/login\/\?next=|name="pass"|id="m_login_email"/i.test(html);
}

const VISITOR_COOKIE_KEYS = ['c_user', 'xs', 'datr', 'sb', 'fr', 'presence', 'wd', 'locale'];

export function normalizeVisitorCookie(raw: string): string | null {
  const input = raw.trim().replace(/^cookie:\s*/i, '').replace(/^["']|["']$/g, '');
  const found = new Map<string, string>();
  for (const part of input.split(';')) {
    const piece = part.trim();
    const eq = piece.indexOf('=');
    if (eq <= 0) continue;
    const key = piece.slice(0, eq).trim();
    const value = piece.slice(eq + 1).trim();
    if (!VISITOR_COOKIE_KEYS.includes(key) || !value) continue;
    found.set(key, value);
  }
  const user = found.get('c_user');
  if (!user || !/^\d+$/.test(user) || !found.get('xs')) return null;
  return VISITOR_COOKIE_KEYS.filter((key) => found.has(key)).map((key) => `${key}=${found.get(key)}`).join('; ');
}

export function looseFacebookTime(text: string, now: Date): string | null {
  const hour = text.match(/\b(\d{1,2})\s*(?:hrs?|hours?)\b/i);
  if (hour) return new Date(now.getTime() - Number(hour[1]) * 3_600_000).toISOString();
  const minute = text.match(/\b(\d{1,3})\s*(?:mins?|minutes?)\b/i);
  if (minute) return new Date(now.getTime() - Number(minute[1]) * 60_000).toISOString();
  const day = text.match(/\b(\d{1,2})\s*days?\b/i);
  if (day) return new Date(now.getTime() - Number(day[1]) * 86_400_000).toISOString();
  if (/\byesterday\b/i.test(text)) return new Date(now.getTime() - 86_400_000).toISOString();

  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const dated = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (!dated) return null;
  const month = months.findIndex((name) => dated[1].toLowerCase().startsWith(name));
  if (month < 0) return null;
  let hourOfDay = dated[3] ? Number(dated[3]) : 12;
  const minuteOfDay = dated[4] ? Number(dated[4]) : 0;
  const meridiem = dated[5]?.toLowerCase();
  if (meridiem === 'pm' && hourOfDay < 12) hourOfDay += 12;
  if (meridiem === 'am' && hourOfDay === 12) hourOfDay = 0;
  let year = now.getUTCFullYear();
  const stamped = zonedTime(year, month, Number(dated[2]), hourOfDay, minuteOfDay, 'America/Denver');
  if (stamped.getTime() > now.getTime() + 86_400_000) {
    return zonedTime(year - 1, month, Number(dated[2]), hourOfDay, minuteOfDay, 'America/Denver').toISOString();
  }
  return stamped.toISOString();
}

export async function fetchPublicFacebookPosts(pageUrl: string): Promise<{
  posts: PublicFacebookPost[];
  blocked: boolean;
  needsLogin: boolean;
}> {
  const posts = new Map<string, PublicFacebookPost>();
  let sawPage = false;
  let sawLoginWall = false;

  for (const url of pageCandidates(pageUrl)) {
    const html = await fetchHtml(url);
    if (!html) continue;
    if (isFacebookBlock(html)) continue;
    sawPage = true;
    if (pageRequiresLogin(html)) sawLoginWall = true;
    for (const post of parsePublicFacebookHtml(html)) {
      posts.set(post.id, post);
    }
  }

  const found = [...posts.values()];
  return { posts: found, blocked: !sawPage, needsLogin: found.length === 0 && sawLoginWall };
}

function pageCandidates(pageUrl: string): string[] {
  const url = new URL(pageUrl);
  const path = `${url.pathname}${url.search}`;
  return [
    `https://www.facebook.com${path}`,
    `https://mbasic.facebook.com${path}`,
    `https://m.facebook.com${path}`,
  ];
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const html = await response.text();
    if (response.url.includes('/login')) return html;
    return html;
  } catch (error) {
    console.error('Public Facebook page could not be read:', error);
    return null;
  }
}

function isFacebookBlock(html: string): boolean {
  const short = html.length < 4000;
  return short && /<title>\s*Error\s*<\/title>/i.test(html);
}

function addPost(
  found: Map<string, PublicFacebookPost>,
  message: string,
  around: string,
  imageLabel: string
) {
  const permalink = findPermalink(around);
  const imageUrl = findImage(around);
  const createdTime = findCreatedTime(around);
  if (looksLikePageChrome(message)) return;
  const id = findId(around, permalink, message);
  if (found.has(id)) return;
  found.set(id, {
    id,
    message: message.replace(/\s+\n/g, '\n').trim(),
    permalink,
    imageUrl,
    createdTime,
    imageLabel,
  });
}

function findPermalink(around: string): string | null {
  const absolute = around.match(
    /https?:\/\/(?:www\.|m\.|mbasic\.)?facebook\.com\/[^\s"'<>\\]+/i
  );
  if (absolute) return cleanUrl(absolute[0]);
  const relative = around.match(/href="(\/(?:permalink|story|posts|photo)[^"]+)"/i);
  if (relative) return cleanUrl(`https://www.facebook.com${relative[1]}`);
  return null;
}

function findImage(around: string): string | null {
  const match = around.match(/https?:\/\/[^\s"'<>\\]*fbcdn\.net[^\s"'<>\\]+/i);
  return match ? cleanUrl(match[0]) : null;
}

function findCreatedTime(around: string): string | null {
  const iso = around.match(/"created_time"\s*:\s*"([^"]+)"/);
  if (iso) return iso[1];
  const unix = around.match(/"creation_time"\s*:\s*"?(\d{10,13})"?/);
  if (unix) {
    const raw = Number(unix[1]);
    return new Date(raw > 10_000_000_000 ? raw : raw * 1000).toISOString();
  }
  return looseFacebookTime(textFromHtml(around), new Date());
}

function looksLikePageChrome(message: string): boolean {
  return /--fds-|__fb-|:root\b|\{--/.test(message);
}

function visiblePostText(chunk: string): string {
  const lines = textFromHtml(chunk).split('\n').map((line) => line.trim()).filter(Boolean);
  const useful = lines.filter((line) => {
    if (line.length < 8) return false;
    if (/^(like|comment|share|follow|following|full story|see more|more|message|photos|about|posts|reels|mentions|reviews|followers|log in|sign up|facebook)$/i.test(line)) {
      return false;
    }
    if (/--fds-|__fb-|:root\b|\{--/.test(line)) return false;
    return !/^\d+\s*(?:hrs?|hours?|mins?|minutes?|days?)$/i.test(line);
  });
  return useful.slice(0, 6).join('\n').slice(0, 2000);
}

function zonedTime(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const utcGuess = new Date(Date.UTC(year, month, day, hour, minute));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(utcGuess);
  const name = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT-7';
  const offset = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const minutes = offset
    ? (offset[1] === '-' ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3] || 0))
    : -7 * 60;
  return new Date(utcGuess.getTime() - minutes * 60_000);
}

function findId(around: string, permalink: string | null, message: string): string {
  const story = around.match(/story_fbid(?:=|":")([^&"'\\]+)/);
  if (story) return story[1];
  const post = around.match(/\/posts\/(\d+)/);
  if (post) return post[1];
  const basis = permalink || message.slice(0, 180);
  return createHash('sha1').update(basis).digest('hex').slice(0, 20);
}

function textFromHtml(chunk: string): string {
  const withBreaks = chunk
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtml(withBreaks).replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}

function decodeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'");
}

function cleanUrl(value: string): string {
  return value.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/\\+$/, '');
}
