import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { postToFacebook, getPageAccessToken } from '@/lib/facebook-helpers';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, imageUrl } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get Facebook connection
    const facebookConnection = await prisma.setting.findUnique({
      where: { key: 'facebook_connection' },
    });

    if (!facebookConnection) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      );
    }

    const connectionData = JSON.parse(facebookConnection.value);

    if (!connectionData.connected || !connectionData.accessToken) {
      return NextResponse.json(
        { error: 'Facebook connection invalid' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (connectionData.expiresAt && new Date(connectionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Facebook connection expired. Please reconnect.' },
        { status: 400 }
      );
    }

    // Prepare post options
    const postOptions: { message: string; imageUrl?: string } = {
      message: message.trim(),
    };

    if (imageUrl && imageUrl.trim()) {
      postOptions.imageUrl = imageUrl.trim();
    }

    // Post to Facebook
    // Use new approach: get fresh page token from user token if available
    const postId = await postToFacebook(
      connectionData.accessToken || '', // Fallback to stored page token
      connectionData.pageId,
      postOptions,
      connectionData.userAccessToken // Pass user token to get fresh page token
    );

    // Persist metadata so we can show it in the content manager
    try {
      let pageToken = connectionData.accessToken || '';
      if (connectionData.userAccessToken) {
        try {
          pageToken = await getPageAccessToken(connectionData.userAccessToken, connectionData.pageId);
        } catch (refreshError) {
          console.warn('Failed to refresh page token for post metadata:', refreshError);
        }
      }

      const detailsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?` +
        `fields=id,permalink_url,full_picture,message,created_time` +
        `&access_token=${pageToken}`,
        { method: 'GET' }
      );
      const detailsData = await detailsResponse.json();

      const postedAt = detailsData.created_time ? new Date(detailsData.created_time) : new Date();

      await prisma.facebookPost.upsert({
        where: { postId },
        update: {
          message: (detailsData.message || postOptions.message || '').trim(),
          imageUrl: detailsData.full_picture || postOptions.imageUrl?.trim() || null,
          permalink: detailsData.permalink_url || null,
          pageId: connectionData.pageId,
          createdBy: session.user?.id || null,
          postedAt,
        },
        create: {
          postId,
          pageId: connectionData.pageId,
          message: (detailsData.message || postOptions.message || '').trim(),
          imageUrl: detailsData.full_picture || postOptions.imageUrl?.trim() || null,
          permalink: detailsData.permalink_url || null,
          createdBy: session.user?.id || null,
          postedAt,
        },
      });
    } catch (persistError) {
      console.error('Failed to store Facebook post metadata:', persistError);
    }

    return NextResponse.json({ 
      success: true, 
      postId,
      message: 'Post published successfully to Facebook'
    });
  } catch (error) {
    console.error('Facebook post error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to Facebook' },
      { status: 500 }
    );
  }
}

