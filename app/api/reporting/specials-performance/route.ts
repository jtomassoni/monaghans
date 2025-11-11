import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Specials Performance API
 * Tracks special performance metrics
 * Designed to be extensible for future features (sales data, profitability, etc.)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const type = searchParams.get('type'); // 'food' or 'drink'

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (type) {
      where.type = type;
    }

    // Get specials
    const specials = await prisma.special.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Get activity logs for specials
    const specialActivities = await prisma.activityLog.findMany({
      where: {
        entityType: 'special',
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Group activities by special
    const activitiesBySpecial = new Map<string, number>();
    specialActivities.forEach(activity => {
      const count = activitiesBySpecial.get(activity.entityId) || 0;
      activitiesBySpecial.set(activity.entityId, count + 1);
    });

    // Build performance data
    const performance = specials.map(special => {
      const activityCount = activitiesBySpecial.get(special.id) || 0;
      return {
        id: special.id,
        title: special.title,
        type: special.type,
        isActive: special.isActive,
        activityCount,
        appliesOn: special.appliesOn,
        timeWindow: special.timeWindow,
        startDate: special.startDate,
        endDate: special.endDate,
        // Future: Add sales count, revenue, profit margin, etc.
        // salesCount: 0,
        // revenue: 0,
        // profitMargin: 0,
        createdAt: special.createdAt,
        updatedAt: special.updatedAt,
      };
    });

    // Group by type
    const byType = {
      food: performance.filter(s => s.type === 'food'),
      drink: performance.filter(s => s.type === 'drink'),
    };

    return NextResponse.json({
      period: days,
      summary: {
        total: specials.length,
        active: specials.filter(s => s.isActive).length,
        food: byType.food.length,
        drink: byType.drink.length,
      },
      specials: performance,
      byType,
      // Future: Add trends, top performers, etc.
      // trends: {},
      // topPerformers: [],
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch specials performance');
  }
}

