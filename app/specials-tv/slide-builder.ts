import { SlideContent, SlideItem } from './types';

const MAX_ITEMS_PER_SLIDE = 6;
const EVENTS_MAX_ITEMS_PER_SLIDE = 6; // allow all configured events to fit one slide
const TEXT_LIMITS = {
  title: 40,
  subtitle: 60,
  body: 140,
  footer: 60,
  itemTitle: 40,
  itemMeta: 60,
  itemDetail: 120,
};

export type SlideBuilderInput = {
  todayLabel: string;
  happyHour?: {
    title?: string;
    description?: string;
    times?: string;
  };
  food: SlideItem[];
  drink: SlideItem[];
  events: SlideItem[];
  config: {
    includeFoodSpecials: boolean;
    includeDrinkSpecials: boolean;
    includeHappyHour: boolean;
    includeEvents: boolean;
    customSlides: any[];
  };
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ');

function cleanText(
  value: string | null | undefined,
  limit: number,
  options?: { preserveNewlines?: boolean }
): string | undefined {
  if (!value) return undefined;
  const sanitized = stripHtml(String(value));

  if (options?.preserveNewlines) {
    const normalized = sanitized
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.replace(/\s+$/g, ''))
      .join('\n')
      .trim();
    return normalized || undefined;
  }

  const normalized = sanitized
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return undefined;
  // Leave full text intact — slides have ample space for longer copy.
  if (normalized.length <= limit) return normalized;
  return normalized;
}

function cleanItem(item: SlideItem): SlideItem | null {
  const title = cleanText(item.title, TEXT_LIMITS.itemTitle);
  if (!title) return null;
  return {
    title,
    note: cleanText(item.note, TEXT_LIMITS.itemMeta),
    time: cleanText(item.time, TEXT_LIMITS.itemMeta),
    detail: cleanText(item.detail, TEXT_LIMITS.itemDetail),
    image: item.image || undefined, // Preserve image field if present
  };
}

function chunkIntoSlides(
  items: SlideItem[],
  base: Omit<SlideContent, 'sequence' | 'items'>,
  sequenceStart: number,
  maxPerSlide: number = MAX_ITEMS_PER_SLIDE
): { slides: SlideContent[]; nextSequence: number } {
  const slides: SlideContent[] = [];
  for (let i = 0; i < items.length; i += maxPerSlide) {
    const chunk = items.slice(i, i + maxPerSlide);
    slides.push({
      ...base,
      id: i === 0 ? base.id : `${base.id}-${Math.floor(i / MAX_ITEMS_PER_SLIDE) + 1}`,
      items: chunk,
      sequence: sequenceStart++,
    });
  }
  return { slides, nextSequence: sequenceStart };
}

/**
 * Deterministic slide order for the TV: Happy Hour (with drink specials) → Food → Events → Custom → Fallback.
 * This keeps the wall display predictable and separates playlist generation from the admin UI.
 */
export function buildSlides(input: SlideBuilderInput): SlideContent[] {
  const slides: SlideContent[] = [];
  const { config } = input;
  let sequence = 1;

  const addSlide = (slide: Omit<SlideContent, 'sequence'>) => {
    slides.push({ ...slide, sequence: sequence++ });
  };

  // Happy Hour (always shown if enabled, since it's 7 days a week)
  // Includes drink specials as items when available
  if (config.includeHappyHour) {
    const cleanedDrinks = config.includeDrinkSpecials
      ? (input.drink.map(cleanItem).filter(Boolean) as SlideItem[])
      : [];
    
    // Debug: Log drink specials processing
    if (input.drink.length > 0) {
      console.log('[DEBUG Slide Builder] Drink specials:', {
        inputCount: input.drink.length,
        cleanedCount: cleanedDrinks.length,
        includeDrinkSpecials: config.includeDrinkSpecials,
        inputDrinks: input.drink.map(d => ({ title: d.title, note: d.note, detail: d.detail })),
        cleanedDrinks: cleanedDrinks.map(d => ({ title: d.title, note: d.note, detail: d.detail })),
      });
    }
    
    // If we have drink specials, chunk them into the happy hour slide(s)
    if (cleanedDrinks.length > 0) {
      const baseSlide: Omit<SlideContent, 'sequence' | 'items'> = {
        id: 'happy-hour',
        label: 'Happy Hour',
        title: cleanText(input.happyHour?.title || 'Happy Hour', TEXT_LIMITS.title) || 'Happy Hour',
        subtitle: cleanText(input.happyHour?.times, TEXT_LIMITS.subtitle),
        body: cleanText(input.happyHour?.description, TEXT_LIMITS.body),
        footer: `Ask about our food specials`,
        accent: 'gold',
        source: 'happyHour',
      };
      const chunked = chunkIntoSlides(cleanedDrinks, baseSlide, sequence);
      slides.push(...chunked.slides);
      sequence = chunked.nextSequence;
    } else {
      // No drink specials, just show happy hour info (always show since it's 7 days a week)
      addSlide({
        id: 'happy-hour',
        label: 'Happy Hour',
        title: cleanText(input.happyHour?.title || 'Happy Hour', TEXT_LIMITS.title) || 'Happy Hour',
        subtitle: cleanText(input.happyHour?.times, TEXT_LIMITS.subtitle),
        body: cleanText(input.happyHour?.description, TEXT_LIMITS.body),
        footer: `Ask about our food specials`,
        accent: 'gold',
        source: 'happyHour',
      });
    }
  }

  // Drink specials (shown independently when enabled, even if happy hour is off)
  // Only show if happy hour is disabled (when happy hour is enabled, drinks are shown in happy hour slide)
  if (config.includeDrinkSpecials && !config.includeHappyHour && input.drink.length > 0) {
    const cleanedDrinks = input.drink.map(cleanItem).filter(Boolean) as SlideItem[];
    if (cleanedDrinks.length > 0) {
      const baseSlide: Omit<SlideContent, 'sequence' | 'items'> = {
        id: 'drink-specials',
        label: 'Drink Specials',
        title: `Today's Drinks`,
        subtitle: cleanText(input.todayLabel, TEXT_LIMITS.subtitle),
        accent: 'gold',
        footer: 'Ask about our food specials',
        source: 'drink',
      };
      const chunked = chunkIntoSlides(cleanedDrinks, baseSlide, sequence);
      slides.push(...chunked.slides);
      sequence = chunked.nextSequence;
    }
  }

  // Food specials
  if (config.includeFoodSpecials && input.food.length > 0) {
    const cleaned = input.food.map(cleanItem).filter(Boolean) as SlideItem[];
    if (cleaned.length > 0) {
      const baseSlide: Omit<SlideContent, 'sequence' | 'items'> = {
        id: 'food-specials',
        label: 'Food Specials',
        title: `Today's Food`,
        subtitle: cleanText(input.todayLabel, TEXT_LIMITS.subtitle),
        accent: 'accent',
        footer: 'Ask about our drink specials',
        source: 'food',
      };
      const chunked = chunkIntoSlides(cleaned, baseSlide, sequence);
      slides.push(...chunked.slides);
      sequence = chunked.nextSequence;
    }
  }

  // Upcoming events
  if (config.includeEvents && input.events.length > 0) {
    const cleaned = input.events.map(cleanItem).filter(Boolean) as SlideItem[];
    if (cleaned.length > 0) {
      const eventCountLabel = cleaned.length === 1 ? '1 upcoming event' : `${cleaned.length} upcoming events`;
      const baseSlide: Omit<SlideContent, 'sequence' | 'items'> = {
        id: 'events',
        label: 'Upcoming Events',
        title: '', // no hero title to reduce wasted space
        subtitle: cleanText(eventCountLabel, TEXT_LIMITS.subtitle),
        accent: 'accent',
        footer: 'Tell your crew',
        source: 'events',
      };
      const chunked = chunkIntoSlides(cleaned, baseSlide, sequence, EVENTS_MAX_ITEMS_PER_SLIDE);
      slides.push(...chunked.slides);
      sequence = chunked.nextSequence;
    }
  }

  // Custom slides from CMS config
  const customSlides = (config.customSlides || [])
    .filter((slide) => slide && slide.isEnabled !== false)
    .map((slide: any, idx: number) => ({
      ...slide,
      position: typeof slide.position === 'number' ? slide.position : idx + 1,
    }))
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  for (const custom of customSlides) {
    const title = cleanText(custom.title, TEXT_LIMITS.title);
    if (!title) continue;
    // Valid accent colors - preserve the selected accent color
    const validAccents = ['accent', 'gold', 'blue', 'green', 'purple', 'orange', 'teal', 'pink', 'cyan'];
    const accent = validAccents.includes(custom.accent) ? custom.accent : 'accent';
    addSlide({
      id: String(custom.id || `custom-${slides.length + 1}`),
      label: cleanText(custom.label || 'Custom', TEXT_LIMITS.subtitle) || 'Custom',
      title,
      subtitle: cleanText(custom.subtitle, TEXT_LIMITS.subtitle),
      body: cleanText(custom.body, TEXT_LIMITS.body, { preserveNewlines: true }),
      footer: cleanText(custom.footer, TEXT_LIMITS.footer),
      accent,
      source: 'custom',
    });
  }

  if (slides.length === 0) {
    addSlide({
      id: 'fallback',
      label: 'Today’s Specials',
      title: 'Ask your bartender',
      body: 'If you are seeing this, CMS data is unavailable. We will refresh automatically.',
      footer: 'Content refreshes in real time',
      accent: 'accent',
      source: 'fallback',
    });
  }

  return slides.sort((a, b) => a.sequence - b.sequence);
}

