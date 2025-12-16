import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { extractEventPattern } from '@/lib/event-pattern-helpers';
import { parseDateTimeLocalAsCompanyTimezone, getCompanyTimezone } from '@/lib/timezone';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const upcoming = searchParams.get('upcoming') === 'true';

    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (upcoming) {
      where.startDateTime = {
        gte: new Date(),
      };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDateTime: 'asc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    return handleError(error, 'Failed to fetch events');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    
    // CRITICAL: Parse datetime strings as company timezone, not server timezone
    // This ensures dates are consistent whether requests come from production (UTC) or local dev (any timezone)
    const timezone = await getCompanyTimezone();
    let startDateTime: Date;
    
    if (typeof body.startDateTime === 'string') {
      // Check if it's a datetime-local format (YYYY-MM-DDTHH:mm) or ISO string
      if (body.startDateTime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // datetime-local format - parse as company timezone
        startDateTime = parseDateTimeLocalAsCompanyTimezone(body.startDateTime, timezone);
      } else {
        // ISO string or other format - parse normally (it should already be in UTC)
        startDateTime = new Date(body.startDateTime);
      }
    } else {
      startDateTime = new Date(body.startDateTime);
    }
    
    let endDateTime: Date | null = null;
    if (body.endDateTime) {
      if (typeof body.endDateTime === 'string') {
        if (body.endDateTime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
          endDateTime = parseDateTimeLocalAsCompanyTimezone(body.endDateTime, timezone);
        } else {
          endDateTime = new Date(body.endDateTime);
        }
      } else {
        endDateTime = new Date(body.endDateTime);
      }
    }
    
    // Extract pattern information
    const pattern = extractEventPattern(startDateTime, body.recurrenceRule);
    
    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        startDateTime,
        endDateTime,
        venueArea: body.venueArea || 'bar',
        recurrenceRule: body.recurrenceRule,
        exceptions: body.exceptions ? JSON.stringify(body.exceptions) : null,
        isAllDay: body.isAllDay ?? false,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        image: body.image,
        isActive: body.isActive ?? true,
        dayOfWeek: pattern?.dayOfWeek ?? null,
        weekOfMonth: pattern?.weekOfMonth ?? null,
        monthDay: pattern?.monthDay ?? null,
        patternMetadata: pattern?.patternMetadata ? JSON.stringify(pattern.patternMetadata) : null,
      } as any,
    });

    await logActivity(
      user.id,
      'create',
      'event',
      event.id,
      event.title,
      undefined,
      `created event "${event.title}"`
    );

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create event');
  }
}

