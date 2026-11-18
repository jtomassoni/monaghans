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
    const message = textFromHtml(chunk).slice(0, 2000);
    if (message.length < 8) continue;
    addPost(found, message, chunk, chunk.includes('/stories/') ? 'Text read from the story' : 'Text read from the photo');
  }

  return [...found.values()];
}

export function pageRequiresLogin(html: string): boolean {
  return /comet_loggedout_pkg|login_form|\/login\/\?next=/i.test(html);
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
  if (!unix) return null;
  const raw = Number(unix[1]);
  return new Date(raw > 10_000_000_000 ? raw : raw * 1000).toISOString();
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
