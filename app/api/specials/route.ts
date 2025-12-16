import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { getMountainTimeWeekday, parseAnyDateAsMountainTime } from '@/lib/timezone';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const today = searchParams.get('today') === 'true';

    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (today) {
      const todayName = getMountainTimeWeekday();
      where.appliesOn = {
        contains: todayName,
      };
    }

    const specials = await prisma.special.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(specials);
  } catch (error) {
    return handleError(error, 'Failed to fetch specials');
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
    const special = await prisma.special.create({
      data: {
        title: body.title,
        description: body.description,
        priceNotes: body.priceNotes,
        type: body.type || 'food',
        appliesOn: typeof body.appliesOn === 'string' ? body.appliesOn : JSON.stringify(body.appliesOn || []),
        timeWindow: body.timeWindow,
        // Always parse dates as Mountain Time regardless of format or user's timezone
        // This ensures dates are consistent whether requests come from production (UTC) or local dev (any timezone)
        startDate: parseAnyDateAsMountainTime(body.startDate),
        endDate: parseAnyDateAsMountainTime(body.endDate),
        image: body.image,
        isActive: body.isActive ?? true,
      },
    });

    await logActivity(
      user.id,
      'create',
      'special',
      special.id,
      special.title,
      undefined,
      `created special "${special.title}"`
    );

    return NextResponse.json(special, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create special');
  }
}

