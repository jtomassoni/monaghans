import { SlideContent } from '@/app/specials-tv/types';
import { buildSlides, SlideBuilderInput } from '@/app/specials-tv/slide-builder';
import { prisma } from './prisma';
import { createSindustryOsAdSlide } from './sindustry-os-ad';

export type AdCreativeWithAsset = {
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

export type FullSlideAd = {
  id: string;
  type: 'AD_FULL';
  asset: {
    id: string;
    storageKey: string;
    width: number | null;
    height: number | null;
  };
  creative?: AdCreativeWithAsset;
};

/**
 * Build playlist with ads integrated
 * Extends existing buildSlides() function to include:
 * - CONTENT slides from Slide model
 * - FULL_SLIDE ads inserted every N content slides
 */
export async function buildSignagePlaylistWithAds(
  input: SlideBuilderInput,
  options: {
    includeAds: boolean;
    adsPerContentSlide?: number; // Default: insert ad every 4 content slides
  }
): Promise<{
  slides: SlideContent[];
  embeddedAds: AdCreativeWithAsset[];
}> {
  const now = new Date();
  const embeddedAds: AdCreativeWithAsset[] = [];

  // Build base slides using existing function
  const baseSlides = buildSlides(input);

  // Fetch CONTENT slides from database (within schedule window)
  const contentSlides = await prisma.slide.findMany({
    where: {
      type: 'CONTENT',
      active: true,
      OR: [
        { startAt: null },
        { startAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
      ],
    },
    include: {
      asset: {
        include: {
          upload: {
            select: {
              id: true,
              originalFilename: true,
              mimeType: true,
            },
          },
        },
      },
    },
    orderBy: [
      { orderIndex: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Convert CONTENT slides to SlideContent format
  // CONTENT slides are image-based, so they render similar to ad slides but without the ad flag
  const contentSlideContents: SlideContent[] = contentSlides.map((slide, idx) => ({
    id: `content-${slide.id}`,
    label: slide.title || 'Content',
    title: slide.title || '',
    subtitle: undefined,
    body: undefined,
    items: undefined,
    accent: 'accent',
    footer: undefined,
    source: 'custom', // Use 'custom' source type for content slides
    sequence: baseSlides.length + idx + 1,
    // Add asset info for rendering (CONTENT slides are image-based)
    asset: {
      id: slide.asset.id,
      storageKey: slide.asset.storageKey,
      width: slide.asset.width,
      height: slide.asset.height,
    },
    isContentSlide: true, // Flag to distinguish from ad slides
  }));

  // Combine base slides with content slides
  let allContentSlides = [...baseSlides, ...contentSlideContents];

  // If ads are enabled, insert platform + local FULL_SLIDE ads
  let finalSlides: SlideContent[] = allContentSlides;
  if (options.includeAds) {
    const adsPerContent = options.adsPerContentSlide ?? 4;

    // Platform inventory: Sindustry OS promo (admin billing toggle)
    const adSlides: SlideContent[] = [createSindustryOsAdSlide()];

    // Local sponsorship FULL_SLIDE campaigns (if any)
    const fullSlideAds = await fetchActiveFullSlideAds(now);
    for (const ad of fullSlideAds) {
      adSlides.push({
        id: ad.id,
        label: 'Advertisement',
        title: '',
        subtitle: undefined,
        body: undefined,
        items: undefined,
        accent: 'accent',
        footer: undefined,
        source: 'custom',
        sequence: 0,
        asset: ad.asset,
        adCreative: ad.creative,
        isAd: true,
      });
    }

    finalSlides = insertAdSlides(allContentSlides, adSlides, adsPerContent);

    // Fetch embedded ads for AdZone component
    const embeddedAdCreatives = await fetchActiveEmbeddedAds(now);
    embeddedAds.push(...embeddedAdCreatives);
  }

  // Re-sequence all slides
  finalSlides = finalSlides.map((slide, idx) => ({
    ...slide,
    sequence: idx + 1,
  }));

  return {
    slides: finalSlides,
    embeddedAds,
  };
}

/**
 * Fetch active FULL_SLIDE ad creatives
 */
async function fetchActiveFullSlideAds(now: Date): Promise<FullSlideAd[]> {
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      tier: 'FULL_SLIDE',
      active: true,
      OR: [
        { startAt: null },
        { startAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
      ],
    },
    include: {
      creatives: {
        where: {
          active: true,
        },
        include: {
          asset: {
            select: {
              id: true,
              storageKey: true,
              width: true,
              height: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const ads: FullSlideAd[] = [];
  for (const campaign of campaigns) {
    for (const creative of campaign.creatives) {
      ads.push({
        id: `ad-${creative.id}`,
        type: 'AD_FULL',
        asset: creative.asset,
        creative: {
          id: creative.id,
          campaignId: creative.campaignId,
          assetId: creative.assetId,
          destinationUrl: creative.destinationUrl,
          qrEnabled: creative.qrEnabled,
          active: creative.active,
          asset: creative.asset,
        },
      });
    }
  }

  return ads;
}

/**
 * Fetch active EMBEDDED ad creatives
 */
async function fetchActiveEmbeddedAds(now: Date): Promise<AdCreativeWithAsset[]> {
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      tier: 'EMBEDDED',
      active: true,
      OR: [
        { startAt: null },
        { startAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
      ],
    },
    include: {
      creatives: {
        where: {
          active: true,
        },
        include: {
          asset: {
            select: {
              id: true,
              storageKey: true,
              width: true,
              height: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const creatives: AdCreativeWithAsset[] = [];
  for (const campaign of campaigns) {
    // Weight-based selection: add each creative (weight) times
    for (const creative of campaign.creatives) {
      const weight = campaign.weight || 1;
      for (let i = 0; i < weight; i++) {
        creatives.push({
          id: creative.id,
          campaignId: creative.campaignId,
          assetId: creative.assetId,
          destinationUrl: creative.destinationUrl,
          qrEnabled: creative.qrEnabled,
          active: creative.active,
          asset: creative.asset,
        });
      }
    }
  }

  // Shuffle for variety (Fisher-Yates)
  for (let i = creatives.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [creatives[i], creatives[j]] = [creatives[j], creatives[i]];
  }

  return creatives;
}

/**
 * Insert ad slides into content slides every N content slides.
 * Rotates through the ad pool (platform + local sponsorship).
 */
function insertAdSlides(
  contentSlides: SlideContent[],
  ads: SlideContent[],
  adsPerContent: number
): SlideContent[] {
  if (ads.length === 0) return contentSlides;

  const result: SlideContent[] = [];
  let adIndex = 0;

  for (let i = 0; i < contentSlides.length; i++) {
    result.push(contentSlides[i]);

    // Insert ad every N content slides (but not at the very start or end)
    if ((i + 1) % adsPerContent === 0 && i < contentSlides.length - 1) {
      const ad = ads[adIndex % ads.length];
      adIndex++;
      result.push({
        ...ad,
        id: `${ad.id}-${adIndex}`,
        sequence: result.length + 1,
      });
    }
  }

  // If the playlist is short, still show at least one platform/local ad
  if (result.length === contentSlides.length && contentSlides.length > 0) {
    result.push({
      ...ads[0],
      id: `${ads[0].id}-tail`,
      sequence: result.length + 1,
    });
  }

  return result;
}

