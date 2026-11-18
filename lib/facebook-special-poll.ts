import { getCompanyTimezoneDateString } from '@/lib/timezone';

export interface FacebookSpecialPollResult {
  postId: string;
  excerpt: string;
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

export function pollExcerpt(message: string): string {
  const text = message.replace(/\s+/g, ' ').trim();
  if (text.length <= 140) return text;
  return `${text.slice(0, 137)}...`;
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
        permalink: typeof row.permalink === 'string' ? row.permalink : null,
        outcome: typeof row.outcome === 'string' ? row.outcome : 'error',
        detail: row.detail,
      }];
    });
  } catch {
    return [];
  }
}
