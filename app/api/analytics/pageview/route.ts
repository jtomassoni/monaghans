import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Privacy-safe pageview tracking
 * Only stores: path, date (no personal data, no cookies, no IP addresses)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, timestamp } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Skip admin and API routes
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Get today's date (YYYY-MM-DD format)
    const date = timestamp 
      ? new Date(timestamp).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Store pageview in settings as aggregated data
    // Format: { "pageviews": { "2025-01-27": { "/": 10, "/menu": 5, ... } } }
    const analyticsKey = 'analytics_pageviews';
    
    let analytics = await prisma.setting.findUnique({
      where: { key: analyticsKey },
    });

    let pageviews: Record<string, Record<string, number>> = {};
    
    if (analytics) {
      try {
        pageviews = JSON.parse(analytics.value);
      } catch {
        pageviews = {};
      }
    }

    // Initialize date if it doesn't exist
    if (!pageviews[date]) {
      pageviews[date] = {};
    }

    // Increment pageview count for this path on this date
    pageviews[date][path] = (pageviews[date][path] || 0) + 1;

    // Update or create the setting
    if (analytics) {
      await prisma.setting.update({
        where: { key: analyticsKey },
        data: {
          value: JSON.stringify(pageviews),
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.setting.create({
        data: {
          key: analyticsKey,
          value: JSON.stringify(pageviews),
          description: 'Privacy-safe pageview analytics (path and date only)',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silently fail - analytics should never break the user experience
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

