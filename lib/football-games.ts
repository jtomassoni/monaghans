export const FOOTBALL_GAME_TAG = 'football-game';
export const HOUSE_MEAL_TAG_PREFIX = 'house-meal:';

export const POTLUCK_BRING_LINE = 'Bring a side or dessert to share';

const GAME_DURATION_MS = 3.5 * 60 * 60 * 1000;

export function parseEventTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string');
  }
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === 'string');
      }
    } catch {
      return [trimmed];
    }
  }
  return [];
}

export function isFootballGameEvent(event: { tags?: unknown; title?: string | null }): boolean {
  const tags = parseEventTags(event.tags);
  if (tags.includes(FOOTBALL_GAME_TAG)) return true;
  return (event.title || '').toLowerCase().includes('broncos');
}

export function footballGameTitle(opponent: string): string {
  const trimmed = opponent.trim();
  if (!trimmed) return 'Broncos Game';
  if (/^broncos\b/i.test(trimmed)) return trimmed;
  return `Broncos vs. ${trimmed}`;
}

export function opponentFromFootballTitle(title: string): string {
  const match = title.match(/^broncos\s+vs\.?\s+(.+)$/i);
  if (match) return match[1].trim();
  return title.replace(/^broncos\s+/i, '').trim();
}

export function houseMealFromTags(tags: unknown): string {
  const found = parseEventTags(tags).find((tag) =>
    tag.toLowerCase().startsWith(HOUSE_MEAL_TAG_PREFIX)
  );
  if (!found) return '';
  return found.slice(HOUSE_MEAL_TAG_PREFIX.length).trim();
}

export function houseMealFromEvent(event: { tags?: unknown; description?: string | null }): string {
  const fromTag = houseMealFromTags(event.tags);
  if (fromTag) return fromTag;
  const match = (event.description || '').match(
    /house\s+(?:provides\s+)?(.+?)\s+for the pot luck/i
  );
  return match ? match[1].trim() : '';
}

export function footballGameDescription(houseMeal: string): string {
  const meal = houseMeal.trim() || 'a house meal';
  return `House ${meal} for the pot luck buffet — bring a side or dessert to share.`;
}

export function withFootballGameTag(tags: unknown): string[] {
  const next = parseEventTags(tags).filter((tag) => tag !== FOOTBALL_GAME_TAG);
  next.unshift(FOOTBALL_GAME_TAG);
  return next;
}

export function withFootballGameTags(tags: unknown, houseMeal: string): string[] {
  const next = withFootballGameTag(tags).filter(
    (tag) => !tag.toLowerCase().startsWith(HOUSE_MEAL_TAG_PREFIX)
  );
  if (houseMeal.trim()) {
    next.push(`${HOUSE_MEAL_TAG_PREFIX}${houseMeal.trim()}`);
  }
  return next;
}

export type FootballGameLike = {
  startDateTime: Date | string;
  endDateTime?: Date | string | null;
  isActive?: boolean;
  tags?: unknown;
  title?: string | null;
  description?: string | null;
};

export function getFootballGameEnd(start: Date, endDateTime?: Date | string | null): Date {
  if (endDateTime) return new Date(endDateTime);
  return new Date(start.getTime() + GAME_DURATION_MS);
}

export function findUpcomingFootballGame<T extends FootballGameLike>(
  events: T[],
  now: Date
): T | null {
  const upcoming = events
    .filter((event) => event.isActive !== false && isFootballGameEvent(event))
    .map((event) => {
      const start = new Date(event.startDateTime);
      const end = getFootballGameEnd(start, event.endDateTime);
      return { event, start, end };
    })
    .filter(({ end }) => end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return upcoming[0]?.event ?? null;
}

export function footballGameBadge(start: Date, now: Date): string {
  if (start.getTime() <= now.getTime()) return 'Happening Now';
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (start.getTime() - now.getTime() <= weekMs) return "This Week's Game";
  return 'Upcoming Game';
}
