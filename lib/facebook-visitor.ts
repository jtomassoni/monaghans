import {
  facebookPageTarget,
  normalizeVisitorCookie,
  pageRequiresLogin,
  parsePublicFacebookHtml,
  type PublicFacebookPost,
} from '@/lib/facebook-public-page';

const BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function fetchVisitorFacebookPosts(pageUrl: string, rawCookie: string): Promise<
  | { ok: true; posts: PublicFacebookPost[] }
  | { ok: false; reason: string }
> {
  const cookie = normalizeVisitorCookie(rawCookie);
  if (!cookie) {
    return { ok: false, reason: 'Save a normal Facebook login on the Facebook specials page.' };
  }

  const posts = new Map<string, PublicFacebookPost>();
  let sawPage = false;
  let sawLogin = false;
  for (const url of visitorUrls(pageUrl)) {
    const html = await fetchHtml(url, cookie);
    if (!html) continue;
    if (html.length < 4000 && /<title>\s*Error\s*<\/title>/i.test(html)) continue;
    sawPage = true;
    if (pageRequiresLogin(html)) sawLogin = true;
    for (const post of parsePublicFacebookHtml(html)) posts.set(post.id, post);
    if (posts.size > 0) break;
  }

  if (posts.size > 0) return { ok: true, posts: [...posts.values()] };
  if (sawLogin) {
    return {
      ok: false,
      reason: 'Facebook did not accept this login. Open Facebook in your browser, then paste a fresh cookie from a facebook.com request.',
    };
  }
  if (!sawPage) return { ok: false, reason: 'Could not open the Facebook page.' };
  return { ok: false, reason: 'Facebook opened the page, but no posts were on it.' };
}

function visitorUrls(pageUrl: string): string[] {
  const url = new URL(pageUrl);
  const path = `${url.pathname}${url.search}`;
  const target = facebookPageTarget(pageUrl);
  const urls = [
    `https://mbasic.facebook.com${path}`,
    `https://m.facebook.com${path}`,
    `https://www.facebook.com${path}`,
  ];
  if (target.id) urls.unshift(`https://mbasic.facebook.com/profile.php?id=${target.id}&v=timeline`);
  return urls;
}

async function fetchHtml(url: string, cookie: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: cookie,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    return await response.text();
  } catch (error) {
    console.error('Facebook page could not be opened:', error instanceof Error ? error.message : error);
    return null;
  }
}
