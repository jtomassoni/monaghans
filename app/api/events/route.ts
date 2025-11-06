import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

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
    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        startDateTime: new Date(body.startDateTime),
        endDateTime: body.endDateTime ? new Date(body.endDateTime) : null,
        venueArea: body.venueArea || 'bar',
        recurrenceRule: body.recurrenceRule,
        exceptions: body.exceptions ? JSON.stringify(body.exceptions) : null,
        isAllDay: body.isAllDay ?? false,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        image: body.image,
        isActive: body.isActive ?? true,
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

