import type { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import {
  buildLeadProfileChangeNote,
  getUserIdForLeadNote,
} from '@/lib/private-dining-lead-timeline';

type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

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

/**
 * GET /api/private-dining-leads/[id]
 * Get a single lead with all related data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    let lead;
    try {
      lead = await prisma.privateDiningLead.findUnique({
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
      const fallbackLead = await prisma.privateDiningLead.findUnique({
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
      lead = fallbackLead ? { ...fallbackLead, emails: [] } : null;
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(lead);
  } catch (error) {
    return handleError(error, 'Failed to fetch lead');
  }
}

/**
 * PATCH /api/private-dining-leads/[id]
 * Update a lead
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, groupSize, preferredDate, message, status } = body;

    const existing = await prisma.privateDiningLead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const noteContent = buildLeadProfileChangeNote(
      {
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        groupSize: existing.groupSize,
        preferredDate: existing.preferredDate,
        message: existing.message,
        status: existing.status,
      },
      { name, phone, email, groupSize, preferredDate, message, status }
    );

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (groupSize !== undefined) updateData.groupSize = groupSize;
    if (preferredDate !== undefined) updateData.preferredDate = new Date(preferredDate);
    if (message !== undefined) updateData.message = message;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0 && !noteContent) {
      let unchanged;
      try {
        unchanged = await prisma.privateDiningLead.findUnique({
          where: { id },
          include: {
            event: true,
            emails: { orderBy: { createdAt: 'asc' } },
            notes: { orderBy: { createdAt: 'desc' } },
            contacts: { orderBy: { createdAt: 'asc' } },
          },
        });
      } catch (error) {
        if (!isMissingLeadEmailTableError(error)) throw error;
        const fb = await prisma.privateDiningLead.findUnique({
          where: { id },
          include: {
            event: true,
            notes: { orderBy: { createdAt: 'desc' } },
            contacts: { orderBy: { createdAt: 'asc' } },
          },
        });
        unchanged = fb ? { ...fb, emails: [] } : null;
      }
      if (!unchanged) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      return NextResponse.json(unchanged);
    }

    const createdBy = await getUserIdForLeadNote(session);

    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      if (Object.keys(updateData).length > 0) {
        await tx.privateDiningLead.update({
          where: { id },
          data: updateData,
        });
      }
      if (noteContent) {
        await tx.leadNote.create({
          data: {
            leadId: id,
            content: noteContent,
            createdBy,
          },
        });
      }
    });

    let lead;
    try {
      lead = await prisma.privateDiningLead.findUnique({
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
      const fallbackLead = await prisma.privateDiningLead.findUnique({
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
      lead = fallbackLead ? { ...fallbackLead, emails: [] } : null;
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    return handleError(error, 'Failed to update lead');
  }
}

/**
 * DELETE /api/private-dining-leads/[id]
 * Delete a lead
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAccess(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    await prisma.privateDiningLead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete lead');
  }
}

