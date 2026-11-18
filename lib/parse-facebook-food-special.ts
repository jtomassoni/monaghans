/**
 * Pull a food special out of a Facebook page post.
 * Returns null when the post is not a food special. A person still confirms
 * before anything is published, so a close guess is more useful than a miss.
 */

export interface ParsedFoodSpecial {
  title: string;
  description: string | null;
  priceNotes: string | null;
}

const SPECIAL_LABEL =
  /(?:today'?s|tonight'?s|lunch|dinner|food|daily)\s+special\b\s*[:\-–—]?\s*/i;

const FOOD_WORD =
  /\b(sandwich(?:es)?|burger|wings?|tacos?|steak|fish|chips|soup|salad|fries|pie|nachos?|quesadillas?|tenders?|brisket|ribs|meatloaf|chili|pasta|shrimp|chicken|pork|beef|mac(?:\s*(?:and|&))?\s*cheese|sliders?|wraps?|basket|platter|reuben|philly|queso|hot dog|onion rings|fajitas?|cod|pot roast|meatballs?|gyro|pizza|meatloaf|tots)\b/i;

const DRINK_WORD =
  /\b(happy hour|drafts?|wells?|shots?|margaritas?|beers?|wine|cocktails?|pints?|pitchers?|mimosas?)\b/i;

const SKIP_POST =
  /\b(now hiring|we(?:'re| are) hiring|help wanted|we(?:'re| are) closed|closed today|trivia|karaoke|live music|band tonight|happy birthday)\b/i;

const PRICE = /\$\s?\d+(?:\.\d{1,2})?/;

const GENERIC_TITLE =
  /^(today|tonight|tomorrow|special|specials|lunch|dinner|food|daily|all day|available|now|here|this)[.!]*$/i;

export function parseFacebookFoodSpecial(message: string | null | undefined): ParsedFoodSpecial | null {
  const text = (message || '').replace(/\s+/g, ' ').trim();
  if (text.length < 8) return null;
  if (text.includes("What's happening at Monaghan's today")) return null;

  const hasSpecial = SPECIAL_LABEL.test(text);
  const hasFood = FOOD_WORD.test(text);
  const hasPrice = PRICE.test(text);
  const drinkOnly = DRINK_WORD.test(text) && !hasFood;

  if (SKIP_POST.test(text) && !hasSpecial) return null;
  if (drinkOnly) return null;
  if (!hasSpecial && !(hasFood && hasPrice)) return null;

  const priceMatch = text.match(PRICE);
  const priceNotes = priceMatch ? priceMatch[0].replace(/\s+/g, '') : null;

  const labelMatch = text.match(SPECIAL_LABEL);
  let body = labelMatch ? text.slice(labelMatch.index! + labelMatch[0].length).trim() : text;
  body = body.replace(/^(?:is\s+)?(?:an?\s+)?/i, '').trim();
  if (!body) return null;

  const sentences = body.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  let title = cleanTitle(sentences[0] || body);
  if (GENERIC_TITLE.test(title) && sentences.length > 1) {
    title = cleanTitle(sentences[1]);
  }
  if (!title || title.length < 3 || GENERIC_TITLE.test(title)) return null;

  const remainder = sentences.slice(title === cleanTitle(sentences[0] || '') ? 1 : 2).join(' ').trim();
  const description = cleanDescription(remainder);

  return {
    title,
    description,
    priceNotes,
  };
}

function cleanTitle(raw: string): string {
  let title = raw.replace(PRICE, ' ');
  title = title.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, ' ');
  title = title.replace(/\s+/g, ' ').trim();
  title = title.replace(/^[\s:|\-–—.!]+/, '').replace(/[\s,;:\-–—.!|]+$/, '').trim();
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 90) {
    title = title.slice(0, 87).replace(/\s+\S*$/, '').trim();
  }
  return title;
}

function cleanDescription(raw: string): string | null {
  const description = raw.replace(/\s+/g, ' ').trim();
  const withoutPrice = description.replace(PRICE, '').replace(/[\s.!,]+/g, '');
  if (!withoutPrice) return null;
  if (description.length < 3) return null;
  return description.length > 500 ? `${description.slice(0, 497).trim()}…` : description;
}
