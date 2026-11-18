import { findNflTeam } from '@/lib/nfl-teams';
import { textFromVisionResponse } from '@/lib/read-image-text';
import { getCompanyTimezoneDateString } from '@/lib/timezone';
import type { ParsedSpecialSource } from '@/lib/facebook-special-source';

const DEFAULT_MODEL = 'gpt-5.4-mini';
let missingKeyWarned = false;

const PROMPT = [
  'Read one Facebook post from Monaghan\'s Bar and Grill, a Denver bar.',
  'Decide what it is. A post that says special and describes food is a food special, even with no price and even when the dish is unfamiliar.',
  'A Broncos announcement with a pot luck or a house meal is a football game.',
  'A Broncos food item, such as a Broncos burger, is a food special.',
  'Hiring, trivia, music, birthdays, drink specials, greetings, and page code are none.',
  'For a food special, title is the dish and description is the leftover detail.',
  'Use the price written in the post. When a food special has no price, use $14.',
  'Taco Tuesday is the exception: keep a price written in the post, and leave price empty when it names none.',
  'For a football game, opponent is the other NFL team, houseMeal is what the house is bringing, and kickoffLocal is America/Denver local time as YYYY-MM-DDTHH:mm.',
  'When the post names no day, use the next Sunday on or after the post date. When it names no time, use 14:00.',
  'Return JSON with kind set to food, football, or none.',
  'Use empty strings for title, description, price, opponent, houseMeal, and kickoffLocal when they do not apply.',
].join(' ');

export async function interpretFacebookSpecial(input: {
  text: string;
  postedAt: Date;
  timezone: string;
}): Promise<{ parsed: ParsedSpecialSource | null; error: string | null }> {
  const text = input.text.replace(/\s+/g, ' ').trim();
  if (text.length < 8) return { parsed: null, error: null };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    if (!missingKeyWarned) {
      console.error('Specials reading skipped. Set OPENAI_API_KEY.');
      missingKeyWarned = true;
    }
    return { parsed: null, error: 'Set OPENAI_API_KEY to read Facebook specials.' };
  }

  const posted = getCompanyTimezoneDateString(input.postedAt, input.timezone);
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          {
            role: 'user',
            content: `Post time: ${posted} ${input.timezone}\n\n${text}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message || response.statusText;
      console.error('Specials reading failed:', message);
      return { parsed: null, error: 'The post could not be read.' };
    }
    const content = textFromVisionResponse(data);
    if (!content) return { parsed: null, error: 'The post could not be read.' };
    return { parsed: specialFromModelJson(content, input.postedAt, input.timezone, text), error: null };
  } catch (error) {
    console.error('Specials reading failed:', error instanceof Error ? error.message : error);
    return { parsed: null, error: 'The post could not be read.' };
  }
}

export function specialFromModelJson(
  raw: string,
  postedAt: Date,
  timezone: string,
  sourceText = ''
): ParsedSpecialSource | null {
  let value: unknown;
  try {
    value = JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim());
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const kind = stringField(row.kind).toLowerCase();
  if (kind === 'football') {
    const opponent = canonicalTeam(stringField(row.opponent));
    const houseMeal = clip(stringField(row.houseMeal), 80);
    return {
      kind: 'football',
      football: {
        opponent,
        houseMeal,
        kickoffLocal: kickoffOrDefault(stringField(row.kickoffLocal), postedAt, timezone),
      },
      food: null,
    };
  }
  if (kind !== 'food') return null;
  const rawTitle = clip(stringField(row.title), 90) || '';
  const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : '';
  if (title.length < 3) return null;
  const description = clip(stringField(row.description), 500);
  const tacoTuesday = /\btaco tuesday\b/i.test(`${sourceText} ${title} ${description || ''}`);
  return {
    kind: 'food',
    football: null,
    food: {
      title,
      description,
      priceNotes: money(stringField(row.price), tacoTuesday),
    },
  };
}

function money(raw: string, tacoTuesday: boolean): string | null {
  const match = raw.match(/\$?\s?(\d+(?:\.\d{1,2})?)/);
  if (match) return `$${match[1]}`;
  if (tacoTuesday) return null;
  return '$14';
}

function kickoffOrDefault(raw: string, postedAt: Date, timezone: string): string {
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}T${match[2]}:${match[3]}`;
  const posted = getCompanyTimezoneDateString(postedAt, timezone);
  const [year, month, day] = posted.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const untilSunday = (7 - date.getUTCDay()) % 7;
  date.setUTCDate(date.getUTCDate() + untilSunday);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}T14:00`;
}

function canonicalTeam(name: string): string | null {
  if (!name) return null;
  return findNflTeam(name)?.name || clip(name.replace(/^the\s+/i, ''), 40);
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function clip(value: string, max: number): string | null {
  const text = value.trim();
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trim()}…`;
}
