import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import {
  buildCalendarEventCreatedFromLeadNote,
  getUserIdForLeadNote,
} from '@/lib/private-dining-lead-timeline';

function isMissingLeadEmailTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('PrivateDiningLeadEmail') ||
    message.includes('private_dining_lead_email') ||
    message.includes('does not exist') ||
    message.includes("Unknown field `emails`") ||
    message.includes("Unknown arg `emails`") ||
    message.includes("Unknown argument `emails`")
  );
}

// Helper to require admin/owner access
async function requireAdminAccess(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin or Owner access required' }, { status: 403 });
  }
  return { session, permissions };
}

/**
 * POST /api/private-dining-leads/[id]/create-event
 * Create an event from a lead and link them
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, startDateTime, endDateTime, venueArea } = body;

    if (!title || !startDateTime) {
      return NextResponse.json(
        { error: 'Title and start date/time are required' },
        { status: 400 }
      );
    }

    // Get the lead
    const lead = await prisma.privateDiningLead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const start = new Date(startDateTime);
    const end = endDateTime ? new Date(endDateTime) : null;
    const venue = typeof venueArea === 'string' && venueArea.trim() ? venueArea.trim() : 'bar';

    const createdBy = await getUserIdForLeadNote(session);

    const { event } = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.create({
        data: {
          title,
          description: description || null,
          startDateTime: start,
          endDateTime: end,
          venueArea: venue,
          isActive: true,
        },
      });

      await tx.privateDiningLead.update({
        where: { id },
        data: {
          eventId: ev.id,
          status: 'booked',
        },
      });

      await tx.leadNote.create({
        data: {
          leadId: id,
          content: buildCalendarEventCreatedFromLeadNote({
            title,
            description: description || null,
            startDateTime: start,
            endDateTime: end,
            venueArea: venue,
          }),
          createdBy,
        },
      });

      return { event: ev };
    });

    let updatedLead;
    try {
      updatedLead = await prisma.privateDiningLead.findUnique({
        where: { id },
        include: {
          event: true,
          emails: {
            orderBy: { createdAt: 'asc' },
          },
          notes: {
            orderBy: { createdAt: 'desc' },
          },
          contacts: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    } catch (error) {
      if (!isMissingLeadEmailTableError(error)) throw error;
      const fb = await prisma.privateDiningLead.findUnique({
        where: { id },
        include: {
          event: true,
          notes: {
            orderBy: { createdAt: 'desc' },
          },
          contacts: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      updatedLead = fb ? { ...fb, emails: [] as [] } : null;
    }

    return NextResponse.json({
      event,
      lead: updatedLead,
    });
  } catch (error) {
    return handleError(error, 'Failed to create event from lead');
  }
}

