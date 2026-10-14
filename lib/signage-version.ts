import { prisma } from '@/lib/prisma';

/**
 * Latest content-version timestamp for digital signage.
 * Used by both the TV page (SSR baseline) and /api/signage/version (poll target)
 * so they never disagree and trigger a reload loop.
 */
export async function getSignageVersionTimestamp(): Promise<number> {
  const [signageConfig, latestSpecial, latestEvent, latestSlide, latestCampaign, latestCreative] =
    await Promise.all([
      prisma.setting.findUnique({
        where: { key: 'signageConfig' },
        select: { updatedAt: true },
      }),
      prisma.special.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.event.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.slide.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.adCampaign.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.adCreative.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

  const timestamps = [
    signageConfig?.updatedAt,
    latestSpecial?.updatedAt,
    latestEvent?.updatedAt,
    latestSlide?.updatedAt,
    latestCampaign?.updatedAt,
    latestCreative?.updatedAt,
  ]
    .filter((value): value is Date => Boolean(value))
    .map((value) => new Date(value).getTime());

  return timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
}
