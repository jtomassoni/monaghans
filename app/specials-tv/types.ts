// Slide model for the TV-only signage experience.
// This is intentionally isolated from admin UI components to keep concerns separate.
export type SlideSource = 'happyHour' | 'food' | 'drink' | 'events' | 'custom' | 'fallback';

export type SlideItem = {
  title: string;
  note?: string;
  time?: string;
  detail?: string;
  image?: string;
};

export type SlideContent = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  body?: string;
  items?: SlideItem[];
  accent?: 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan';
  footer?: string;
  source: SlideSource;
  sequence: number;
};

