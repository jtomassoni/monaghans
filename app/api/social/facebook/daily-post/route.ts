import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToFacebook, formatDailySpecialsForFacebook } from '@/lib/facebook-helpers';

/**
 * API endpoint for daily posts about specials and events
 * This should be called via a cron job (e.g., Vercel Cron, or external service)
 * 
 * Example cron schedule: Run daily at 9 AM
 * 0 9 * * * curl -X POST https://yourdomain.com/api/social/facebook/daily-post
 */
export async function POST(req: NextRequest) {
  try {
    // Check for authorization header (optional, but recommended for cron jobs)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Facebook connection
    const facebookConnection = await prisma.setting.findUnique({
      where: { key: 'facebook_connection' },
    });

    if (!facebookConnection) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      );
    }

    const connectionData = JSON.parse(facebookConnection.value);

    if (!connectionData.connected || !connectionData.accessToken) {
      return NextResponse.json(
        { error: 'Facebook connection invalid' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (connectionData.expiresAt && new Date(connectionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Facebook connection expired. Please reconnect.' },
        { status: 400 }
      );
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get active specials for today
    const todayWeekday = today.toLocaleDateString('en-US', { weekday: 'long' });
    const allSpecials = await prisma.special.findMany({
      where: {
        isActive: true,
        OR: [
          // Specials with date ranges that include today
          {
            AND: [
              { startDate: { lte: today } },
              {
                OR: [
                  { endDate: null },
                  { endDate: { gte: today } },
                ],
              },
            ],
          },
          // Specials without date restrictions (will filter by weekday below)
          {
            AND: [
              { startDate: null },
              { endDate: null },
            ],
          },
        ],
      },
    });

    // Filter specials by weekday (appliesOn is stored as JSON array)
    const specials = allSpecials.filter((special) => {
      if (!special.appliesOn) return false;
      
      try {
        const appliesOnDays = JSON.parse(special.appliesOn);
        return Array.isArray(appliesOnDays) && appliesOnDays.includes(todayWeekday);
      } catch {
        // If parsing fails, check if it's a string match
        return special.appliesOn.includes(todayWeekday);
      }
    });

    // Get events happening today
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        startDateTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        startDateTime: 'asc',
      },
    });

    // If no specials or events, don't post
    if (specials.length === 0 && events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No specials or events for today, skipping post',
      });
    }

    // Format and post to Facebook
    // Convert events to have string dates for the helper function
    const eventsForFacebook = events.map(event => ({
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime.toISOString(),
    }));
    const message = formatDailySpecialsForFacebook(specials, eventsForFacebook);

    const postId = await postToFacebook(
      connectionData.accessToken,
      connectionData.pageId,
      { message }
    );

    // Log to PostQueue for tracking
    await prisma.postQueue.create({
      data: {
        channel: 'facebook',
        payload: JSON.stringify({ message, specialsCount: specials.length, eventsCount: events.length }),
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      postId,
      specialsCount: specials.length,
      eventsCount: events.length,
    });
  } catch (error) {
    console.error('Daily post error:', error);
    
    // Log failed post to queue
    try {
      await prisma.postQueue.create({
        data: {
          channel: 'facebook',
          payload: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (queueError) {
      console.error('Failed to log to post queue:', queueError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to Facebook' },
      { status: 500 }
    );
  }
}

