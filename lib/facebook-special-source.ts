import { parseFacebookFoodSpecial, type ParsedFoodSpecial } from '@/lib/parse-facebook-food-special';
import { parseFacebookFootballPost, type ParsedFootballPost } from '@/lib/parse-facebook-football';

export type ParsedSpecialSource =
  | { kind: 'football'; football: ParsedFootballPost; food: null }
  | { kind: 'food'; football: null; food: ParsedFoodSpecial };

export function parseSpecialText(
  text: string,
  postedAt: Date,
  timezone: string
): ParsedSpecialSource | null {
  const football = parseFacebookFootballPost(text, postedAt, timezone);
  if (football) return { kind: 'football', football, food: null };
  const food = parseFacebookFoodSpecial(text);
  if (food) return { kind: 'food', football: null, food };
  return null;
}

export function specialScanLabel(
  parsed: ParsedSpecialSource | null,
  readFromPhoto: boolean
): { outcome: string; detail: string } {
  if (!parsed) {
    return {
      outcome: 'not-a-special',
      detail: readFromPhoto
        ? 'The photo was read. It was not a food special or a Broncos pot luck.'
        : 'Not a food special or a Broncos pot luck.',
    };
  }
  const prefix = readFromPhoto ? 'Read from the photo. ' : '';
  if (parsed.kind === 'football') {
    const opponent = parsed.football.opponent ? `Broncos vs ${parsed.football.opponent}` : 'Broncos game';
    const meal = parsed.football.houseMeal
      ? `House meal: ${parsed.football.houseMeal}.`
      : 'House meal was not named.';
    return { outcome: 'football', detail: `${prefix}Football game: ${opponent}. ${meal}` };
  }
  const price = parsed.food.priceNotes ? ` Price ${parsed.food.priceNotes}.` : '';
  return { outcome: 'food', detail: `${prefix}Food special: ${parsed.food.title}.${price}` };
}

export function reviewMessage(input: {
  caption: string;
  imageLabel: string | null;
  imageText: string | null;
}): string {
  const parts: string[] = [];
  if (input.caption.trim()) parts.push(input.caption.trim());
  if (input.imageText?.trim() && input.imageLabel) {
    parts.push(`${input.imageLabel}:\n${input.imageText.trim()}`);
  }
  return parts.join('\n\n');
}
