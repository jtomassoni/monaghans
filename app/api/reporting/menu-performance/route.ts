import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Menu Performance API
 * Tracks menu item performance metrics
 * Designed to be extensible for future features (sales data, profitability, etc.)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get menu items with their activity counts
    const menuItems = await prisma.menuItem.findMany({
      include: {
        section: {
          select: {
            id: true,
            name: true,
            menuType: true,
          },
        },
      },
    });

    // Get activity logs for menu items
    const menuItemActivities = await prisma.activityLog.findMany({
      where: {
        entityType: 'menuItem',
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Group activities by menu item
    const activitiesByItem = new Map<string, number>();
    menuItemActivities.forEach(activity => {
      const count = activitiesByItem.get(activity.entityId) || 0;
      activitiesByItem.set(activity.entityId, count + 1);
    });

    // Get pageviews for menu page (if available)
    const analyticsSetting = await prisma.setting.findUnique({
      where: { key: 'analytics_pageviews' },
    });

    let menuPageviews = 0;
    if (analyticsSetting) {
      try {
        const pageviews: Record<string, Record<string, number>> = JSON.parse(analyticsSetting.value);
        const dateKeys = Object.keys(pageviews).filter(date => {
          const pageviewDate = new Date(date);
          return pageviewDate >= startDate;
        });

        dateKeys.forEach(date => {
          const dayPageviews = pageviews[date];
          if (dayPageviews['/menu']) {
            menuPageviews += dayPageviews['/menu'];
          }
        });
      } catch {
        // Ignore parse errors
      }
    }

    // Build performance data
    const performance = menuItems.map(item => {
      const activityCount = activitiesByItem.get(item.id) || 0;
      return {
        id: item.id,
        name: item.name,
        section: item.section.name,
        menuType: item.section.menuType,
        price: item.price,
        isAvailable: item.isAvailable,
        activityCount,
        // Future: Add sales count, revenue, profit margin, etc.
        // salesCount: 0,
        // revenue: 0,
        // profitMargin: 0,
        lastUpdated: item.updatedAt,
      };
    });

    // Sort by activity count (most edited items first)
    performance.sort((a, b) => b.activityCount - a.activityCount);

    return NextResponse.json({
      period: days,
      summary: {
        totalItems: menuItems.length,
        activeItems: menuItems.filter(item => item.isAvailable).length,
        menuPageviews,
      },
      items: performance,
      // Future: Add trends, top performers, etc.
      // trends: {},
      // topPerformers: [],
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch menu performance');
  }
}

