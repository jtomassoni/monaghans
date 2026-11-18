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
