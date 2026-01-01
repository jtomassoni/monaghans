import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

/**
 * GET /api/signage/version
 * Returns a version/timestamp that changes when any signage-related data is updated.
 * This is used by the signage page to detect when it needs to refresh.
 */
export async function GET() {
  try {
    // Get the most recent update time from:
    // 1. Signage config setting
    // 2. Specials (food/drink)
    // 3. Events (if they're used in signage)
    
    const [signageConfig, latestSpecial, latestEvent] = await Promise.all([
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
    ]);

    // Get the most recent timestamp from all sources
    const timestamps: Date[] = [];
    
    if (signageConfig?.updatedAt) {
      timestamps.push(new Date(signageConfig.updatedAt));
    }
    
    if (latestSpecial?.updatedAt) {
      timestamps.push(new Date(latestSpecial.updatedAt));
    }
    
    if (latestEvent?.updatedAt) {
      timestamps.push(new Date(latestEvent.updatedAt));
    }

    // If no timestamps found, use current time
    const latestTimestamp = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(d => d.getTime())))
      : new Date();

    // Return as ISO string and also as a timestamp for easy comparison
    return NextResponse.json({
      version: latestTimestamp.toISOString(),
      timestamp: latestTimestamp.getTime(),
    });
  } catch (error) {
    return handleError(error, 'Failed to get signage version');
  }
}

