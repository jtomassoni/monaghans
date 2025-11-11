import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { generateDatesForPattern, extractEventPattern } from '@/lib/event-pattern-helpers';

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceYear, targetYear, eventIds } = body;

    if (!sourceYear || !targetYear) {
      return NextResponse.json(
        { error: 'Source year and target year are required' },
        { status: 400 }
      );
    }

    if (targetYear <= sourceYear) {
      return NextResponse.json(
        { error: 'Target year must be after source year' },
        { status: 400 }
      );
    }

    // Find all recurring events (or specific events if eventIds provided)
    const where: any = {
      recurrenceRule: { not: null },
      isActive: true,
    };

    if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
      where.id = { in: eventIds };
    }

    const sourceEvents = await prisma.event.findMany({
      where,
    });

    if (sourceEvents.length === 0) {
      return NextResponse.json(
        { error: 'No recurring events found to duplicate' },
        { status: 404 }
      );
    }

    const duplicatedEvents = [];
    const errors = [];

    for (const sourceEvent of sourceEvents) {
      try {
        // Extract pattern from existing event or from recurrence rule
        let pattern;
        if (sourceEvent.patternMetadata) {
          // Use stored pattern metadata
          const metadata = JSON.parse(sourceEvent.patternMetadata);
          pattern = {
            dayOfWeek: sourceEvent.dayOfWeek ?? undefined,
            weekOfMonth: sourceEvent.weekOfMonth ?? undefined,
            monthDay: sourceEvent.monthDay ?? undefined,
            patternMetadata: metadata,
          };
        } else {
          // Extract pattern from recurrence rule
          const extracted = extractEventPattern(
            new Date(sourceEvent.startDateTime),
            sourceEvent.recurrenceRule
          );
          if (!extracted) {
            errors.push({
              eventId: sourceEvent.id,
              title: sourceEvent.title,
              error: 'Could not extract pattern from event',
            });
            continue;
          }
          pattern = extracted;
        }

        // Generate dates for the target year
        const targetDates = generateDatesForPattern(pattern, targetYear);

        if (targetDates.length === 0) {
          errors.push({
            eventId: sourceEvent.id,
            title: sourceEvent.title,
            error: 'No dates generated for target year',
          });
          continue;
        }

        // Create events for each date in the target year
        for (const targetDate of targetDates) {
          // Calculate the time from the original event
          const originalStart = new Date(sourceEvent.startDateTime);
          const originalEnd = sourceEvent.endDateTime
            ? new Date(sourceEvent.endDateTime)
            : null;

          // Set the date but preserve the time
          const newStart = new Date(targetDate);
          newStart.setHours(
            originalStart.getHours(),
            originalStart.getMinutes(),
            originalStart.getSeconds(),
            originalStart.getMilliseconds()
          );

          let newEnd: Date | null = null;
          if (originalEnd) {
            newEnd = new Date(targetDate);
            const duration =
              originalEnd.getTime() - originalStart.getTime();
            newEnd.setTime(newStart.getTime() + duration);
          }

          // Parse exceptions if they exist
          const exceptions = sourceEvent.exceptions
            ? JSON.parse(sourceEvent.exceptions)
            : [];

          // Create the new event
          const newEvent = await prisma.event.create({
            data: {
              title: sourceEvent.title,
              description: sourceEvent.description,
              startDateTime: newStart,
              endDateTime: newEnd,
              venueArea: sourceEvent.venueArea,
              recurrenceRule: sourceEvent.recurrenceRule,
              exceptions: exceptions.length > 0
                ? JSON.stringify(exceptions)
                : null,
              isAllDay: sourceEvent.isAllDay,
              tags: sourceEvent.tags,
              image: sourceEvent.image,
              isActive: sourceEvent.isActive,
              dayOfWeek: pattern.dayOfWeek ?? null,
              weekOfMonth: pattern.weekOfMonth ?? null,
              monthDay: pattern.monthDay ?? null,
              patternMetadata: pattern.patternMetadata
                ? JSON.stringify(pattern.patternMetadata)
                : null,
            } as any,
          });

          await logActivity(
            user.id,
            'create',
            'event',
            newEvent.id,
            newEvent.title,
            undefined,
            `duplicated event "${newEvent.title}" from ${sourceYear} to ${targetYear}`
          );

          duplicatedEvents.push(newEvent);
        }
      } catch (error) {
        errors.push({
          eventId: sourceEvent.id,
          title: sourceEvent.title,
          error:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      duplicated: duplicatedEvents.length,
      errors: errors.length,
      events: duplicatedEvents,
      errorDetails: errors,
    });
  } catch (error) {
    return handleError(error, 'Failed to duplicate calendar');
  }
}

