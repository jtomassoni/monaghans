import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const published = searchParams.get('published') === 'true';

    const where: any = {};
    if (published) {
      const now = new Date();
      where.isPublished = true;
      where.AND = [
        {
          OR: [
            { publishAt: null },
            { publishAt: { lte: now } },
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ],
        },
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(announcements);
  } catch (error) {
    return handleError(error, 'Failed to fetch announcements');
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
    
    // Handle date conversion - ensure we properly handle null, empty strings, and valid dates
    const publishAt = body.publishAt && typeof body.publishAt === 'string' && body.publishAt.trim() 
      ? new Date(body.publishAt) 
      : null;
    const expiresAt = body.expiresAt && typeof body.expiresAt === 'string' && body.expiresAt.trim()
      ? new Date(body.expiresAt)
      : null;

    // Validate dates are valid
    if (publishAt && isNaN(publishAt.getTime())) {
      return NextResponse.json({ error: 'Invalid publish date' }, { status: 400 });
    }
    if (expiresAt && isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 });
    }

    // Validate that expired announcements cannot be published
    if (body.isPublished && expiresAt) {
      const now = new Date();
      if (expiresAt < now) {
        return NextResponse.json({ 
          error: 'Cannot publish expired announcement',
          details: 'The expiration date has already passed. Please update the expiration date or uncheck Published.'
        }, { status: 400 });
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        body: body.body,
        heroImage: body.heroImage,
        publishAt,
        expiresAt,
        isPublished: body.isPublished ?? false,
        crossPostFacebook: body.crossPostFacebook ?? false,
        crossPostInstagram: body.crossPostInstagram ?? false,
        ctaText: body.ctaText || null,
        ctaUrl: body.ctaUrl || null,
      },
    });

    await logActivity(
      user.id,
      'create',
      'announcement',
      announcement.id,
      announcement.title,
      undefined,
      `created announcement "${announcement.title}"`
    );

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create announcement');
  }
}

