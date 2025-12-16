import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { extractEventPattern } from '@/lib/event-pattern-helpers';
import { parseDateTimeLocalAsCompanyTimezone, getCompanyTimezone } from '@/lib/timezone';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    return handleError(error, 'Failed to fetch event');
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const currentEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!currentEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // CRITICAL: Parse datetime strings as company timezone, not server timezone
    const timezone = await getCompanyTimezone();
    let startDateTime: Date;
    
    if (typeof body.startDateTime === 'string') {
      if (body.startDateTime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        startDateTime = parseDateTimeLocalAsCompanyTimezone(body.startDateTime, timezone);
      } else {
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

    const event = await prisma.event.update({
      where: { id },
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
        image: body.image !== undefined ? body.image : undefined,
        isActive: body.isActive,
        dayOfWeek: pattern?.dayOfWeek ?? null,
        weekOfMonth: pattern?.weekOfMonth ?? null,
        monthDay: pattern?.monthDay ?? null,
        patternMetadata: pattern?.patternMetadata ? JSON.stringify(pattern.patternMetadata) : null,
      } as any,
    });

    const changes: Record<string, { before: any; after: any }> = {};
    if (currentEvent.title !== body.title) changes.title = { before: currentEvent.title, after: body.title };
    if (currentEvent.isActive !== body.isActive) changes.isActive = { before: currentEvent.isActive, after: body.isActive };

    await logActivity(
      user.id,
      'update',
      'event',
      event.id,
      event.title,
      Object.keys(changes).length > 0 ? changes : undefined,
      `updated event "${event.title}"`
    );

    return NextResponse.json(event);
  } catch (error) {
    return handleError(error, 'Failed to update event');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'event',
      id,
      event.title,
      undefined,
      `deleted event "${event.title}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete event');
  }
}

