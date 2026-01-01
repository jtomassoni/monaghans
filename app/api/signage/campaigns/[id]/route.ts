import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Ad Campaign API (single)
 * GET: Get campaign by ID
 * PATCH: Update campaign
 * DELETE: Delete campaign (checks for related creatives)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      include: {
        creatives: {
          include: {
            asset: {
              include: {
                upload: {
                  select: {
                    id: true,
                    originalFilename: true,
                    mimeType: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            creatives: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return handleError(error, 'Failed to fetch campaign');
  }
}

export async function PATCH(
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

    const existingCampaign = await prisma.adCampaign.findUnique({
      where: { id },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Validate tier if being changed
    if (body.tier) {
      const validTiers = ['FULL_SLIDE', 'EMBEDDED'];
      if (!validTiers.includes(body.tier)) {
        return NextResponse.json(
          { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.tier !== undefined) updateData.tier = body.tier;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.weight !== undefined) updateData.weight = body.weight;
    if (body.startAt !== undefined) updateData.startAt = body.startAt ? new Date(body.startAt) : null;
    if (body.endAt !== undefined) updateData.endAt = body.endAt ? new Date(body.endAt) : null;

    const campaign = await prisma.adCampaign.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            creatives: true,
          },
        },
      },
    });

    // Track changes
    const changes: Record<string, { before: any; after: any }> = {};
    if (body.name !== undefined && body.name !== existingCampaign.name) {
      changes.name = { before: existingCampaign.name, after: body.name };
    }
    if (body.active !== undefined && body.active !== existingCampaign.active) {
      changes.active = { before: existingCampaign.active, after: body.active };
    }

    await logActivity(
      user.id,
      'update',
      'setting',
      campaign.id,
      campaign.name,
      Object.keys(changes).length > 0 ? changes : undefined,
      `Updated ad campaign`
    );

    return NextResponse.json(campaign);
  } catch (error) {
    return handleError(error, 'Failed to update campaign');
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

    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            creatives: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check for related creatives
    if (campaign._count.creatives > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete campaign with ${campaign._count.creatives} creative(s). Please delete or reassign creatives first.`,
        },
        { status: 400 }
      );
    }

    await prisma.adCampaign.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'setting',
      campaign.id,
      campaign.name,
      undefined,
      `Deleted ad campaign`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete campaign');
  }
}

