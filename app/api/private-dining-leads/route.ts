import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { sendPrivateDiningLeadNotification } from '@/lib/private-dining-notifications';

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
 * GET /api/private-dining-leads
 * Get all leads
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const leads = await prisma.privateDiningLead.findMany({
      include: {
        event: true,
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        contacts: true,
        _count: {
          select: {
            notes: true,
            contacts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leads);
  } catch (error) {
    return handleError(error, 'Failed to fetch leads');
  }
}

/**
 * POST /api/private-dining-leads
 * Create a new lead
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { name, phone, email, groupSize, preferredDate, message, status } = body;

    // Validate required fields
    if (!name || !phone || !email || !groupSize || !preferredDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, email, groupSize, and preferredDate are required' },
        { status: 400 }
      );
    }

    // Parse the date
    const preferredDateObj = new Date(preferredDate);
    if (isNaN(preferredDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Create lead + initial creation context note
    const lead = await prisma.$transaction(async (tx) => {
      const createdLead = await tx.privateDiningLead.create({
        data: {
          name,
          phone,
          email,
          groupSize,
          preferredDate: preferredDateObj,
          message: message || null,
          status: status || 'new',
        },
      });

      await tx.leadNote.create({
        data: {
          leadId: createdLead.id,
          content: [
            'Lead created manually in CRM.',
            `Created at: ${new Date().toISOString()}`,
            `Preferred date: ${preferredDateObj.toISOString()}`,
            `Group size: ${groupSize}`,
            ...(message?.trim() ? [`Party request details: ${message.trim()}`] : []),
          ].join('\n'),
          createdBy: authResult.session.user?.id ?? null,
        },
      });

      return tx.privateDiningLead.findUniqueOrThrow({
        where: { id: createdLead.id },
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
    });

    await sendPrivateDiningLeadNotification({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      groupSize: lead.groupSize,
      preferredDate: lead.preferredDate,
      message: lead.message,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create lead');
  }
}

