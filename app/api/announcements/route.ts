import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { postToFacebook, formatAnnouncementForFacebook } from '@/lib/facebook-helpers';

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

    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        body: body.body,
        heroImage: body.heroImage,
        publishAt,
        expiresAt,
        isPublished: true, // Always published - scheduling handled by publishAt/expiresAt
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

    // Post to Facebook if enabled
    if (body.crossPostFacebook) {
      try {
        const facebookConnection = await prisma.setting.findUnique({
          where: { key: 'facebook_connection' },
        });

        if (facebookConnection) {
          const connectionData = JSON.parse(facebookConnection.value);
          
          if (connectionData.connected && connectionData.accessToken) {
            // Check if token is expired
            const isExpired = connectionData.expiresAt && new Date(connectionData.expiresAt) < new Date();
            
            if (!isExpired) {
              const postOptions = formatAnnouncementForFacebook(
                announcement.title,
                announcement.body,
                announcement.heroImage,
                announcement.ctaUrl || undefined
              );

              await postToFacebook(
                connectionData.accessToken,
                connectionData.pageId,
                postOptions
              );

              // Log activity for Facebook post
              await logActivity(
                user.id,
                'create',
                'announcement',
                announcement.id,
                announcement.title,
                undefined,
                `posted announcement "${announcement.title}" to Facebook`
              );
            }
          }
        }
      } catch (error) {
        // Log error but don't fail the announcement creation
        console.error('Failed to post announcement to Facebook:', error);
      }
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create announcement');
  }
}

