import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Slides API
 * GET: List all slides (filterable by type and active status)
 * POST: Create new slide
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'CONTENT', 'AD_FULL', 'AD_EMBEDDED'
    const active = searchParams.get('active'); // 'true' or 'false'

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (active !== null) {
      where.active = active === 'true';
    }

    const slides = await prisma.slide.findMany({
      where,
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
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(slides);
  } catch (error) {
    return handleError(error, 'Failed to fetch slides');
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
    if (!body.type || !body.assetId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, assetId' },
        { status: 400 }
      );
    }

    // Validate type enum
    const validTypes = ['CONTENT', 'AD_FULL', 'AD_EMBEDDED'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: body.assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get max orderIndex for this type to append at end
    const maxOrder = await prisma.slide.findFirst({
      where: { type: body.type },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const slide = await prisma.slide.create({
      data: {
        type: body.type,
        assetId: body.assetId,
        title: body.title || null,
        active: body.active ?? true,
        orderIndex: body.orderIndex ?? (maxOrder ? maxOrder.orderIndex + 1 : 0),
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
      },
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
    });

    // For ad slides, automatically create an ad creative and campaign
    if (body.type === 'AD_FULL' || body.type === 'AD_EMBEDDED') {
      const tier = body.type === 'AD_FULL' ? 'FULL_SLIDE' : 'EMBEDDED';
      
      // Find or create a default campaign for this tier
      let campaign = await prisma.adCampaign.findFirst({
        where: {
          tier,
          active: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!campaign) {
        // Create a default campaign
        campaign = await prisma.adCampaign.create({
          data: {
            name: `Default ${tier === 'FULL_SLIDE' ? 'Full Slide' : 'Embedded'} Campaign`,
            tier,
            active: true,
            weight: 1,
          },
        });
      }

      // Create the ad creative
      await prisma.adCreative.create({
        data: {
          campaignId: campaign.id,
          assetId: body.assetId,
          destinationUrl: body.destinationUrl || null,
          qrEnabled: body.qrEnabled ?? false,
          active: body.active ?? true,
        },
      });
    }

    await logActivity(
      user.id,
      'create',
      'setting', // Using 'setting' as entityType since we don't have 'slide' yet
      slide.id,
      slide.title || `Slide (${slide.type})`,
      undefined,
      `Created ${slide.type.toLowerCase()} slide`
    );

    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create slide');
  }
}

