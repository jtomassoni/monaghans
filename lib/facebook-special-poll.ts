import { getCompanyTimezoneDateString } from '@/lib/timezone';

export interface FacebookSpecialPollResult {
  postId: string;
  excerpt: string;
  message: string;
  permalink: string | null;
  outcome: string;
  detail: string;
}

export interface FacebookSpecialPollRecord {
  ok: boolean;
  summary: string;
  checked: number;
  emailed: number;
  results: FacebookSpecialPollResult[];
}

export function pollPostText(message: string): { excerpt: string; message: string } {
  const full = message.replace(/\r/g, '').trim().slice(0, 4000);
  const single = full.replace(/\s+/g, ' ').trim();
  return {
    excerpt: single.length <= 180 ? single : `${single.slice(0, 177)}...`,
    message: full,
  };
}

export function readablePollSummary(summary: string): string {
  return summary.replace(/^Last 24 hours scan\.\s*/, '').trim();
}

export function readablePollExcerpt(excerpt: string): { text: string; pageCode: boolean } {
  const text = excerpt.replace(/\s+/g, ' ').trim();
  if (!text) return { text: '', pageCode: false };
  if (isPageCode(text)) return { text: 'Page code, not a caption.', pageCode: true };
  return { text, pageCode: false };
}

export function isPageCode(text: string): boolean {
  if (text.startsWith('{') || text.startsWith('[')) return true;
  if (text.includes('routing_namespace') || text.includes('__fb-') || text.includes('--fds-')) return true;
  return text.includes(':root') && /--|__fb/.test(text);
}

export function oauthStatePurpose(state: string | null): string | null {
  if (!state) return null;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { purpose?: unknown };
    return typeof parsed.purpose === 'string' ? parsed.purpose : null;
  } catch {
    return null;
  }
}

export function groupPollsByDay<T extends { ranAt: string }>(
  items: T[],
  timeZone: string
): { date: string; label: string; polls: T[] }[] {
  const groups: { date: string; label: string; polls: T[] }[] = [];
  const labelFor = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  for (const item of items) {
    const when = new Date(item.ranAt);
    if (Number.isNaN(when.getTime())) continue;
    const date = getCompanyTimezoneDateString(when, timeZone);
    const current = groups[groups.length - 1];
    if (!current || current.date !== date) {
      groups.push({ date, label: labelFor.format(when), polls: [item] });
    } else {
      current.polls.push(item);
    }
  }

  return groups;
}

export function readPollResults(raw: string): FacebookSpecialPollResult[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Partial<FacebookSpecialPollResult>;
      if (typeof row.postId !== 'string' || typeof row.detail !== 'string') return [];
      return [{
        postId: row.postId,
        excerpt: typeof row.excerpt === 'string' ? row.excerpt : '',
        message: typeof row.message === 'string' ? row.message : '',
        permalink: typeof row.permalink === 'string' ? row.permalink : null,
        outcome: typeof row.outcome === 'string' ? row.outcome : 'error',
        detail: row.detail,
      }];
    });
  } catch {
    return [];
  }
}
