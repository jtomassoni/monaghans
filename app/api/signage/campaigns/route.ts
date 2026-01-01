import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Ad Campaigns API
 * GET: List all campaigns (filterable by tier and active status)
 * POST: Create new campaign
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get('tier'); // 'FULL_SLIDE' or 'EMBEDDED'
    const active = searchParams.get('active'); // 'true' or 'false'

    const where: any = {};
    if (tier) {
      where.tier = tier;
    }
    if (active !== null) {
      where.active = active === 'true';
    }

    const campaigns = await prisma.adCampaign.findMany({
      where,
      include: {
        _count: {
          select: {
            creatives: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    return handleError(error, 'Failed to fetch campaigns');
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
    if (!body.name || !body.tier) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tier' },
        { status: 400 }
      );
    }

    // Validate tier enum
    const validTiers = ['FULL_SLIDE', 'EMBEDDED'];
    if (!validTiers.includes(body.tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 }
      );
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        name: body.name,
        tier: body.tier,
        active: body.active ?? true,
        weight: body.weight ?? 1,
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
      },
      include: {
        _count: {
          select: {
            creatives: true,
          },
        },
      },
    });

    await logActivity(
      user.id,
      'create',
      'setting',
      campaign.id,
      campaign.name,
      undefined,
      `Created ad campaign "${campaign.name}"`
    );

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create campaign');
  }
}

