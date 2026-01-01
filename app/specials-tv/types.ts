// Slide model for the TV-only signage experience.
// This is intentionally isolated from admin UI components to keep concerns separate.
export type SlideSource = 'welcome' | 'happyHour' | 'food' | 'drink' | 'events' | 'custom' | 'fallback';

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
  // Ad-related fields (optional)
  asset?: {
    id: string;
    storageKey: string;
    width: number | null;
    height: number | null;
  };
  adCreative?: {
    id: string;
    campaignId: string;
    assetId: string;
    destinationUrl?: string | null;
    qrEnabled: boolean;
    active: boolean;
    asset: {
      id: string;
      storageKey: string;
      width: number | null;
      height: number | null;
    };
  };
  isAd?: boolean; // Flag to indicate this is an ad slide
  isContentSlide?: boolean; // Flag to indicate this is a CONTENT slide (image-based)
  slideType?: 'text' | 'image'; // 'text' for text-based slides, 'image' for image-based slides
  showBorder?: boolean; // For image slides: show border with accent color (default: true for backward compatibility)
};

