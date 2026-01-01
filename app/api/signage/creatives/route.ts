import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Ad Creatives API
 * GET: List all creatives (filterable by campaignId and active status)
 * POST: Create new creative
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const active = searchParams.get('active'); // 'true' or 'false'

    const where: any = {};
    if (campaignId) {
      where.campaignId = campaignId;
    }
    if (active !== null) {
      where.active = active === 'true';
    }

    const creatives = await prisma.adCreative.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(creatives);
  } catch (error) {
    return handleError(error, 'Failed to fetch creatives');
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

    // Validate required fields
    if (!body.campaignId || !body.assetId) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, assetId' },
        { status: 400 }
      );
    }

    // Verify campaign exists
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: body.campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: body.assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const creative = await prisma.adCreative.create({
      data: {
        campaignId: body.campaignId,
        assetId: body.assetId,
        destinationUrl: body.destinationUrl || null,
        qrEnabled: body.qrEnabled ?? false,
        active: body.active ?? true,
      },
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

    await logActivity(
      user.id,
      'create',
      'setting',
      creative.id,
      `Creative for ${campaign.name}`,
      undefined,
      `Created ad creative`
    );

    return NextResponse.json(creative, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create creative');
  }
}

