import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { getMountainTimeWeekday, parseMountainTimeDate } from '@/lib/timezone';

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
        // Parse dates as Mountain Time to prevent timezone shifts
        startDate: body.startDate ? (typeof body.startDate === 'string' && body.startDate.match(/^\d{4}-\d{2}-\d{2}$/) 
          ? parseMountainTimeDate(body.startDate) 
          : new Date(body.startDate)) : null,
        endDate: body.endDate ? (typeof body.endDate === 'string' && body.endDate.match(/^\d{4}-\d{2}-\d{2}$/) 
          ? parseMountainTimeDate(body.endDate) 
          : new Date(body.endDate)) : null,
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

