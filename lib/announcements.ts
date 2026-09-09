import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { getMountainTimeNow } from '@/lib/timezone';

export type PublicAnnouncement = {
  id: string;
  title: string;
  body: string;
  ctaText: string | null;
  ctaUrl: string | null;
  dismissable: boolean;
  isHighSeverity: boolean;
};

export const getPublishedAnnouncements = cache(async (): Promise<PublicAnnouncement[]> => {
  const now = getMountainTimeNow();
  try {
    return await prisma.announcement.findMany({
      where: {
        isPublished: true,
        AND: [
          { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        body: true,
        ctaText: true,
        ctaUrl: true,
        dismissable: true,
        isHighSeverity: true,
      },
    });
  } catch (error) {
    console.warn('Could not fetch published announcements:', error);
    return [];
  }
});
