import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { getPostInsights, getPageInsights, getPageAccessToken } from '@/lib/facebook-helpers';

/**
 * Facebook Post Analytics API
 * Fetches engagement metrics for cross-posted content
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const postId = searchParams.get('postId'); // Optional: specific post

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

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

    // Get fresh page token if available
    let pageToken = connectionData.accessToken;
    if (connectionData.userAccessToken) {
      try {
        pageToken = await getPageAccessToken(
          connectionData.userAccessToken,
          connectionData.pageId
        );
      } catch (err) {
        console.warn('Failed to refresh page token for analytics:', err);
      }
    }

    // If specific post requested, return just that post's insights
    if (postId) {
      const insights = await getPostInsights(
        pageToken,
        postId,
        connectionData.userAccessToken
      );
      return NextResponse.json({ postId, insights });
    }

    // Get all Facebook posts from database
    const facebookPosts = await prisma.facebookPost.findMany({
      where: {
        postedAt: {
          gte: startDate,
        },
      },
      orderBy: { postedAt: 'desc' },
      take: 100, // Limit to recent 100 posts
    });

    // Fetch insights for each post
    const postsWithInsights = await Promise.all(
      facebookPosts.map(async (post) => {
        try {
          const insights = await getPostInsights(
            pageToken,
            post.postId,
            connectionData.userAccessToken
          );
          return {
            id: post.id,
            postId: post.postId,
            message: post.message,
            link: post.link,
            imageUrl: post.imageUrl,
            permalink: post.permalink,
            postedAt: post.postedAt,
            createdBy: post.createdBy,
            insights,
          };
        } catch (error) {
          console.error(`Failed to fetch insights for post ${post.postId}:`, error);
          return {
            id: post.id,
            postId: post.postId,
            message: post.message,
            link: post.link,
            imageUrl: post.imageUrl,
            permalink: post.permalink,
            postedAt: post.postedAt,
            createdBy: post.createdBy,
            insights: null,
            error: error instanceof Error ? error.message : 'Failed to fetch insights',
          };
        }
      })
    );

    // Calculate aggregate metrics
    const totalImpressions = postsWithInsights.reduce(
      (sum, post) => sum + (post.insights?.impressions || 0),
      0
    );
    const totalReach = postsWithInsights.reduce(
      (sum, post) => sum + (post.insights?.reach || 0),
      0
    );
    const totalEngagedUsers = postsWithInsights.reduce(
      (sum, post) => sum + (post.insights?.engagedUsers || 0),
      0
    );
    const totalReactions = postsWithInsights.reduce(
      (sum, post) => sum + (post.insights?.reactions?.total || 0),
      0
    );
    const totalClicks = postsWithInsights.reduce(
      (sum, post) => sum + (post.insights?.clicks || 0),
      0
    );

    // Get page-level insights
    let pageInsights = null;
    try {
      pageInsights = await getPageInsights(
        pageToken,
        connectionData.pageId,
        connectionData.userAccessToken,
        'days_28'
      );
    } catch (error) {
      console.warn('Failed to fetch page insights:', error);
    }

    return NextResponse.json({
      period: days,
      summary: {
        totalPosts: postsWithInsights.length,
        totalImpressions,
        totalReach,
        totalEngagedUsers,
        totalReactions,
        totalClicks,
        averageImpressions: postsWithInsights.length > 0 
          ? Math.round(totalImpressions / postsWithInsights.length) 
          : 0,
        averageReach: postsWithInsights.length > 0 
          ? Math.round(totalReach / postsWithInsights.length) 
          : 0,
        averageEngagedUsers: postsWithInsights.length > 0 
          ? Math.round(totalEngagedUsers / postsWithInsights.length) 
          : 0,
      },
      pageInsights,
      posts: postsWithInsights,
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch Facebook analytics');
  }
}

