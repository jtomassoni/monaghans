import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function POST(
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
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.recurrenceRule) {
      return NextResponse.json({ error: 'Event is not recurring' }, { status: 400 });
    }

    // Parse existing exceptions
    const exceptions: string[] = event.exceptions ? JSON.parse(event.exceptions) : [];
    
    // Add the date to exceptions if not already present
    if (!exceptions.includes(date)) {
      exceptions.push(date);
    }

    // Update event with new exceptions
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        exceptions: JSON.stringify(exceptions),
      } as any,
    });

    await logActivity(
      user.id,
      'update',
      'event',
      event.id,
      event.title,
      {
        exceptions: {
          before: event.exceptions || '[]',
          after: JSON.stringify(exceptions),
        },
      },
      `added exception date ${date} to recurring event "${event.title}"`
    );

    return NextResponse.json(updatedEvent);
  } catch (error) {
    return handleError(error, 'Failed to add exception');
  }
}

