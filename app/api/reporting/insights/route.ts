import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Insights API
 * Generates actionable insights based on current data
 * Designed to be extensible for future AI-powered insights
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const insights: Array<{
      type: 'info' | 'warning' | 'success' | 'opportunity';
      title: string;
      message: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    const now = new Date();
    const last7Days = new Date();
    last7Days.setDate(now.getDate() - 7);
    const last30Days = new Date();
    last30Days.setDate(now.getDate() - 30);

    // Check for inactive menu items
    const inactiveMenuItems = await prisma.menuItem.count({
      where: { isAvailable: false },
    });

    if (inactiveMenuItems > 0) {
      insights.push({
        type: 'warning',
        title: `${inactiveMenuItems} Menu Item${inactiveMenuItems > 1 ? 's' : ''} Inactive`,
        message: `You have ${inactiveMenuItems} menu item${inactiveMenuItems > 1 ? 's' : ''} marked as unavailable. Consider updating or removing them.`,
        priority: 'medium',
      });
    }

    // Check for unpublished announcements
    const unpublishedAnnouncements = await prisma.announcement.count({
      where: { isPublished: false },
    });

    if (unpublishedAnnouncements > 0) {
      insights.push({
        type: 'info',
        title: `${unpublishedAnnouncements} Draft Announcement${unpublishedAnnouncements > 1 ? 's' : ''}`,
        message: `You have ${unpublishedAnnouncements} announcement${unpublishedAnnouncements > 1 ? 's' : ''} waiting to be published.`,
        priority: 'low',
      });
    }

    // Check for upcoming events
    const upcomingEvents = await prisma.event.count({
      where: {
        isActive: true,
        startDateTime: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
    });

    if (upcomingEvents === 0) {
      insights.push({
        type: 'warning',
        title: 'No Upcoming Events',
        message: 'You have no events scheduled for the next 7 days. Consider adding some to keep your calendar active.',
        priority: 'medium',
      });
    }

    // Check recent activity
    const recentActivity = await prisma.activityLog.count({
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
    });

    if (recentActivity === 0) {
      insights.push({
        type: 'info',
        title: 'No Recent Activity',
        message: 'No content changes in the last 7 days. Keep your site fresh with regular updates.',
        priority: 'low',
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Active Content Management',
        message: `${recentActivity} change${recentActivity > 1 ? 's' : ''} made in the last 7 days. Great job keeping content updated!`,
        priority: 'low',
      });
    }

    // Check for specials without end dates (might be outdated)
    const specialsWithoutEndDate = await prisma.special.count({
      where: {
        isActive: true,
        endDate: null,
        startDate: {
          lte: last30Days, // Started more than 30 days ago
        },
      },
    });

    if (specialsWithoutEndDate > 0) {
      insights.push({
        type: 'warning',
        title: `${specialsWithoutEndDate} Special${specialsWithoutEndDate > 1 ? 's' : ''} May Need Review`,
        message: `You have ${specialsWithoutEndDate} active special${specialsWithoutEndDate > 1 ? 's' : ''} that started more than 30 days ago without an end date. Consider reviewing them.`,
        priority: 'low',
      });
    }

    // Add AI-powered insights (basic level - full AI insights available via /api/reporting/ai-insights)
    try {
      // Get top menu items by sales
      const recentOrders = await prisma.order.findMany({
        where: {
          status: { in: ['completed', 'ready'] },
          createdAt: {
            gte: last7Days,
          },
        },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        take: 100,
      });

      const itemCounts = new Map<string, { name: string; count: number }>();
      for (const order of recentOrders) {
        for (const item of order.items) {
          if (item.menuItemId && item.menuItem) {
            const existing = itemCounts.get(item.menuItemId) || { name: item.menuItem.name, count: 0 };
            existing.count += item.quantity;
            itemCounts.set(item.menuItemId, existing);
          }
        }
      }

      const topItems = Array.from(itemCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      if (topItems.length > 0 && topItems[0].count >= 10) {
        insights.push({
          type: 'opportunity',
          title: `Top Seller: ${topItems[0].name}`,
          message: `"${topItems[0].name}" is your top seller with ${topItems[0].count} orders in the last 7 days. Consider featuring it prominently or creating a combo.`,
          priority: 'medium',
        });
      }
    } catch (error) {
      // Silently fail - AI insights are optional
      console.error('Failed to generate AI insights:', error);
    }

    // Sort by priority (high first, then by type)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      const typeOrder = { warning: 0, info: 1, success: 2, opportunity: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error, 'Failed to generate insights');
  }
}

