import { SlideContent } from '@/app/specials-tv/types';

/**
 * Built-in platform ad for Sindustry OS.
 * Injected into digital signage when ads.enabledByAdmin is on.
 * Admin turns this off for venues on the ad-free package.
 */
export function createSindustryOsAdSlide(sequence = 1): SlideContent {
  return {
    id: 'sindustry-os-platform-ad',
    label: 'Advertisement',
    title: 'Sindustry OS',
    subtitle: 'Bar & restaurant software that runs the room',
    body: 'Specials TV · Events · Private dining · Ops — built for hospitality.',
    footer: 'sindustryos.com',
    accent: 'cyan',
    source: 'sindustry',
    sequence,
    isAd: true,
    isSindustryAd: true,
  };
}
