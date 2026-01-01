import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Ad Creative API (single)
 * GET: Get creative by ID
 * PATCH: Update creative
 * DELETE: Delete creative
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const creative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
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
    });

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    return NextResponse.json(creative);
  } catch (error) {
    return handleError(error, 'Failed to fetch creative');
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

    const existingCreative = await prisma.adCreative.findUnique({
      where: { id },
    });

    if (!existingCreative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Validate campaign if being changed
    if (body.campaignId && body.campaignId !== existingCreative.campaignId) {
      const campaign = await prisma.adCampaign.findUnique({
        where: { id: body.campaignId },
      });

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
    }

    // Validate asset if being changed
    if (body.assetId && body.assetId !== existingCreative.assetId) {
      const asset = await prisma.asset.findUnique({
        where: { id: body.assetId },
      });

      if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (body.campaignId !== undefined) updateData.campaignId = body.campaignId;
    if (body.assetId !== undefined) updateData.assetId = body.assetId;
    if (body.destinationUrl !== undefined) updateData.destinationUrl = body.destinationUrl || null;
    if (body.qrEnabled !== undefined) updateData.qrEnabled = body.qrEnabled;
    if (body.active !== undefined) updateData.active = body.active;

    const creative = await prisma.adCreative.update({
      where: { id },
      data: updateData,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
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
    });

    // Track changes
    const changes: Record<string, { before: any; after: any }> = {};
    if (body.active !== undefined && body.active !== existingCreative.active) {
      changes.active = { before: existingCreative.active, after: body.active };
    }
    if (body.qrEnabled !== undefined && body.qrEnabled !== existingCreative.qrEnabled) {
      changes.qrEnabled = { before: existingCreative.qrEnabled, after: body.qrEnabled };
    }

    await logActivity(
      user.id,
      'update',
      'setting',
      creative.id,
      `Creative for ${creative.campaign.name}`,
      Object.keys(changes).length > 0 ? changes : undefined,
      `Updated ad creative`
    );

    return NextResponse.json(creative);
  } catch (error) {
    return handleError(error, 'Failed to update creative');
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

    const creative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    await prisma.adCreative.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'setting',
      creative.id,
      `Creative for ${creative.campaign.name}`,
      undefined,
      `Deleted ad creative`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete creative');
  }
}

