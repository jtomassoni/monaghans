import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Privacy-safe event tracking
 * Tracks custom events for SEO analysis (menu views, form submissions, etc.)
 * Only stores: event name, params, path, date (no personal data)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, params, path, timestamp } = body;

    if (!event || typeof event !== 'string') {
      return NextResponse.json({ error: 'Invalid event name' }, { status: 400 });
    }

    // Skip admin and API routes
    if (path && (path.startsWith('/admin') || path.startsWith('/api'))) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Get today's date (YYYY-MM-DD format)
    const date = timestamp 
      ? new Date(timestamp).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Store event in settings as aggregated data
    // Format: { "events": { "2025-01-27": { "menu_view": { "/menu": 5, ... }, ... } } }
    const analyticsKey = 'analytics_events';
    
    let analytics = await prisma.setting.findUnique({
      where: { key: analyticsKey },
    });

    let events: Record<string, Record<string, Record<string, number>>> = {};
    
    if (analytics) {
      try {
        events = JSON.parse(analytics.value);
      } catch {
        events = {};
      }
    }

    // Initialize date if it doesn't exist
    if (!events[date]) {
      events[date] = {};
    }

    // Initialize event type if it doesn't exist
    if (!events[date][event]) {
      events[date][event] = {};
    }

    // Use path as key, or 'unknown' if no path provided
    const pathKey = path || 'unknown';

    // Increment event count for this path on this date
    events[date][event][pathKey] = (events[date][event][pathKey] || 0) + 1;

    // Update or create the setting
    if (analytics) {
      await prisma.setting.update({
        where: { key: analyticsKey },
        data: {
          value: JSON.stringify(events),
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.setting.create({
        data: {
          key: analyticsKey,
          value: JSON.stringify(events),
          description: 'Privacy-safe event analytics (event name, path, and date only)',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silently fail - analytics should never break the user experience
    console.error('Analytics event error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}


