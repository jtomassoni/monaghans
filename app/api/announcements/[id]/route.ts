import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { postToFacebook, formatAnnouncementForFacebook } from '@/lib/facebook-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(announcement);
  } catch (error) {
    return handleError(error, 'Failed to fetch announcement');
  }
}

export async function PUT(
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

    const currentAnnouncement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!currentAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

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

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title: body.title,
        body: body.body,
        heroImage: body.heroImage,
        publishAt,
        expiresAt,
        isPublished: true, // Always published - scheduling handled by publishAt/expiresAt
        crossPostFacebook: body.crossPostFacebook,
        crossPostInstagram: body.crossPostInstagram,
        ctaText: body.ctaText || null,
        ctaUrl: body.ctaUrl || null,
      },
    });

    const changes: Record<string, { before: any; after: any }> = {};
    if (currentAnnouncement.title !== body.title) changes.title = { before: currentAnnouncement.title, after: body.title };

    await logActivity(
      user.id,
      'update',
      'announcement',
      announcement.id,
      announcement.title,
      Object.keys(changes).length > 0 ? changes : undefined,
      `updated announcement "${announcement.title}"`
    );

    // Post to Facebook if enabled (only if crossPostFacebook was just enabled or content changed)
    if (body.crossPostFacebook && (
      !currentAnnouncement.crossPostFacebook ||
      currentAnnouncement.title !== body.title ||
      currentAnnouncement.body !== body.body
    )) {
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
                'update',
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
        // Log error but don't fail the announcement update
        console.error('Failed to post announcement to Facebook:', error);
      }
    }

    return NextResponse.json(announcement);
  } catch (error) {
    return handleError(error, 'Failed to update announcement');
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
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Store announcement details before deletion
    const announcementTitle = announcement.title;
    const announcementDetails = {
      title: announcement.title,
      publishAt: announcement.publishAt?.toISOString() || null,
      expiresAt: announcement.expiresAt?.toISOString() || null,
      isPublished: announcement.isPublished,
      hadCTA: !!(announcement.ctaText && announcement.ctaUrl),
    };

    // Delete the announcement
    await prisma.announcement.delete({
      where: { id },
    });

    // Log the deletion with full details
    await logActivity(
      user.id,
      'delete',
      'announcement',
      id,
      announcementTitle,
      {
        announcement: {
          before: JSON.stringify(announcementDetails),
          after: null,
        },
      },
      `deleted announcement "${announcementTitle}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete announcement');
  }
}

