/**
 * A Broncos announcement is a pot-luck football game, not a daily food special.
 * Opponent and house meal can be blank. A person confirms both before it is published.
 */

import { findNflTeam, NFL_TEAMS } from '@/lib/nfl-teams';
import { getCompanyTimezoneDateString } from '@/lib/timezone';

export interface ParsedFootballPost {
  opponent: string | null;
  houseMeal: string | null;
  kickoffLocal: string;
}

const BRONCOS = /\bbroncos\b/i;
const GAME_WORD =
  /\b(pot[\s-]?luck|buffet|kickoff|game|vs\.?|versus|against|sunday|monday night|thursday night)\b/i;
const ROUNDUP = "What's happening at Monaghan's today";

const HOUSE_MEAL =
  /(?:house(?:'s)?(?:\s+is|\s+will)?\s+(?:providing|provides|bringing|brings|making|serving|has)|we(?:'re| are)\s+(?:making|bringing|providing|serving))\s+([^.\n]{2,80})/i;

const VS_OPPONENT =
  /\bbroncos\s+(?:vs\.?|versus|against|play(?:ing)?)\s+(?:the\s+)?([a-z0-9][a-z0-9 .'-]{1,40})/i;

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export function parseFacebookFootballPost(
  message: string | null | undefined,
  postedAt: Date,
  timezone = 'America/Denver'
): ParsedFootballPost | null {
  const text = (message || '').replace(/[ \t]+/g, ' ').trim();
  if (text.length < 8 || text.includes(ROUNDUP)) return null;
  if (!BRONCOS.test(text) || !GAME_WORD.test(text)) return null;

  const postedDay = getCompanyTimezoneDateString(postedAt, timezone);
  const gameDay = resolveGameDay(text, postedDay);
  const kickoff = resolveKickoff(text);

  return {
    opponent: resolveOpponent(text),
    houseMeal: resolveHouseMeal(text),
    kickoffLocal: `${gameDay}T${kickoff}`,
  };
}

function resolveOpponent(text: string): string | null {
  const vs = text.match(VS_OPPONENT);
  if (vs) {
    const fromClause = teamIn(vs[1]);
    if (fromClause) return fromClause;
  }
  return teamIn(text);
}

function teamIn(text: string): string | null {
  const candidates = NFL_TEAMS.flatMap((team) => [
    `${team.city} ${team.name}`,
    team.name,
    ...(team.aliases ?? []),
  ])
    .filter((key) => key.length >= 4)
    .sort((a, b) => b.length - a.length);

  for (const key of candidates) {
    const pattern = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i');
    if (!pattern.test(text)) continue;
    return findNflTeam(key)?.name ?? null;
  }
  return null;
}

function resolveHouseMeal(text: string): string | null {
  const match = text.match(HOUSE_MEAL);
  if (!match) return null;
  let meal = match[1].replace(/\s+/g, ' ').trim();
  meal = meal.replace(/\s+for the pot[\s-]?luck.*$/i, '').trim();
  meal = meal.replace(/[\s,;:\-–—]+$/, '').trim();
  if (meal.length < 2) return null;
  if (/^(the game|a side|sides|dessert|food)$/i.test(meal)) return null;
  return meal.length > 80 ? meal.slice(0, 80).trim() : meal;
}

function resolveKickoff(text: string): '11:00' | '14:00' | '18:00' {
  if (/\b11(?::00)?\s*(?:am|a\.m\.)\b/i.test(text)) return '11:00';
  if (/\b6(?::00)?\s*(?:pm|p\.m\.)\b/i.test(text)) return '18:00';
  if (/\b2(?::00)?\s*(?:pm|p\.m\.)\b/i.test(text)) return '14:00';
  return '14:00';
}

function resolveGameDay(text: string, postedDay: string): string {
  const explicit = explicitDate(text, postedDay);
  if (explicit) return explicit;
  if (/\b(today|tonight)\b/i.test(text)) return postedDay;
  if (/\btomorrow\b/i.test(text)) return addCalendarDays(postedDay, 1);

  for (let index = 0; index < WEEKDAYS.length; index += 1) {
    const pattern = new RegExp(`\\b${WEEKDAYS[index]}\\b`, 'i');
    if (!pattern.test(text)) continue;
    const current = weekdayIndex(postedDay);
    const delta = (index - current + 7) % 7;
    return addCalendarDays(postedDay, delta);
  }

  const current = weekdayIndex(postedDay);
  const untilSunday = (7 - current) % 7;
  return addCalendarDays(postedDay, untilSunday);
}

function explicitDate(text: string, postedDay: string): string | null {
  const monthMatch = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  );
  if (monthMatch) {
    const month = MONTHS[monthMatch[1].toLowerCase().replace('.', '')];
    const day = Number(monthMatch[2]);
    if (month && day >= 1 && day <= 31) {
      return nearestYear(postedDay, month, day);
    }
  }

  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const month = Number(numeric[1]);
    const day = Number(numeric[2]);
    const year = numeric[3] ? normalizeYear(numeric[3]) : null;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      if (year) return ymd(year, month, day);
      return nearestYear(postedDay, month, day);
    }
  }
  return null;
}

function nearestYear(postedDay: string, month: number, day: number): string {
  const year = Number(postedDay.slice(0, 4));
  let candidate = ymd(year, month, day);
  if (calendarDayNumber(candidate) < calendarDayNumber(postedDay) - 14) {
    candidate = ymd(year + 1, month, day);
  }
  return candidate;
}

function normalizeYear(raw: string): number {
  const year = Number(raw);
  return year < 100 ? 2000 + year : year;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function weekdayIndex(ymdValue: string): number {
  const [year, month, day] = ymdValue.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addCalendarDays(ymdValue: string, days: number): string {
  const [year, month, day] = ymdValue.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return ymd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function calendarDayNumber(ymdValue: string): number {
  const [year, month, day] = ymdValue.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
