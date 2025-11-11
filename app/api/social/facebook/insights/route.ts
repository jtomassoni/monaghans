import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPostInsights, getPageInsights, getPageAccessToken } from '@/lib/facebook-helpers';

// GET: Fetch insights for a specific post or page
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const pageId = searchParams.get('pageId');
    const period = searchParams.get('period') as 'day' | 'week' | 'days_28' | null;

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

    // Get fresh page token if user token is available
    let pageToken = connectionData.accessToken;
    if (connectionData.userAccessToken) {
      try {
        pageToken = await getPageAccessToken(
          connectionData.userAccessToken,
          connectionData.pageId
        );
      } catch (err) {
        console.warn('Failed to refresh page token for insights:', err);
      }
    }

    // Fetch post insights
    if (postId) {
      const insights = await getPostInsights(
        pageToken,
        postId,
        connectionData.userAccessToken
      );
      return NextResponse.json(insights);
    }

    // Fetch page insights
    if (pageId || connectionData.pageId) {
      const insights = await getPageInsights(
        pageToken,
        pageId || connectionData.pageId,
        connectionData.userAccessToken,
        period || 'day'
      );
      return NextResponse.json(insights);
    }

    return NextResponse.json(
      { error: 'Either postId or pageId must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Facebook insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

