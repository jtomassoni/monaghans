/**
 * Digital signage ad creative requirements.
 * Image ads are full-bleed — title/copy must be designed into the artwork.
 */
export const FULL_SLIDE_AD_SPECS = {
  label: 'Full Slide',
  width: 1920,
  height: 1080,
  aspectLabel: '16:9',
  summary: '1920 × 1080 px (16:9)',
  /** Hard reject below this (upload validation). */
  minWidth: 1280,
  minHeight: 720,
} as const;

export const EMBEDDED_AD_SPECS = {
  label: 'Embedded',
  width: 800,
  height: 450,
  aspectLabel: '16:9',
  summary: '800 × 450 px (16:9)',
  minWidth: 640,
  minHeight: 360,
} as const;

export function formatAdPixelRequirements(tier: 'FULL_SLIDE' | 'EMBEDDED' = 'FULL_SLIDE'): string {
  const specs = tier === 'EMBEDDED' ? EMBEDDED_AD_SPECS : FULL_SLIDE_AD_SPECS;
  return `${specs.width} × ${specs.height} pixels (${specs.aspectLabel})`;
}
