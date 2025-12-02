import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';

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

    // Create the event
    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        startDateTime: new Date(startDateTime),
        endDateTime: endDateTime ? new Date(endDateTime) : null,
        venueArea: venueArea || 'bar',
        isActive: true,
      },
    });

    // Link the event to the lead
    const updatedLead = await prisma.privateDiningLead.update({
      where: { id },
      data: {
        eventId: event.id,
        status: 'booked', // Automatically mark as booked when event is created
      },
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

    return NextResponse.json({
      event,
      lead: updatedLead,
    });
  } catch (error) {
    return handleError(error, 'Failed to create event from lead');
  }
}

