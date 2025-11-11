import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Pageview Analytics API
 * Aggregates pageview data from analytics
 * Designed to be extensible for future features (conversion tracking, etc.)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const path = searchParams.get('path'); // optional filter

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get analytics data from settings
    const analyticsSetting = await prisma.setting.findUnique({
      where: { key: 'analytics_pageviews' },
    });

    if (!analyticsSetting) {
      return NextResponse.json({
        period: days,
        summary: {
          totalPageviews: 0,
          uniquePaths: 0,
        },
        trends: {
          daily: [],
        },
        topPages: [],
      });
    }

    let pageviews: Record<string, Record<string, number>> = {};
    try {
      pageviews = JSON.parse(analyticsSetting.value);
    } catch {
      pageviews = {};
    }

    // Filter by date range
    const dateKeys = Object.keys(pageviews).filter(date => {
      const pageviewDate = new Date(date);
      return pageviewDate >= startDate;
    });

    // Aggregate data
    const allPageviews: Array<{ path: string; date: string; count: number }> = [];
    const pathTotals: Record<string, number> = {};

    dateKeys.forEach(date => {
      const dayPageviews = pageviews[date];
      Object.entries(dayPageviews).forEach(([pagePath, count]) => {
        if (path && pagePath !== path) return; // Filter by path if specified
        
        allPageviews.push({
          path: pagePath,
          date,
          count,
        });

        pathTotals[pagePath] = (pathTotals[pagePath] || 0) + count;
      });
    });

    // Calculate totals
    const totalPageviews = allPageviews.reduce((sum, item) => sum + item.count, 0);
    const uniquePaths = Object.keys(pathTotals).length;

    // Get top pages
    const topPages = Object.entries(pathTotals)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Aggregate by day
    const dailyTotals: Record<string, number> = {};
    allPageviews.forEach(item => {
      dailyTotals[item.date] = (dailyTotals[item.date] || 0) + item.count;
    });

    const dailyTrends = Object.entries(dailyTotals)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period: days,
      summary: {
        totalPageviews,
        uniquePaths,
      },
      trends: {
        daily: dailyTrends,
      },
      topPages,
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch pageview analytics');
  }
}

