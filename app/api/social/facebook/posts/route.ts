import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPageAccessToken } from '@/lib/facebook-helpers';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const facebookConnection = await prisma.setting.findUnique({
      where: { key: 'facebook_connection' },
    });

    const dbPosts = await prisma.facebookPost.findMany({
      orderBy: { postedAt: 'desc' },
      take: 100,
    });

    const dbPostMap = new Map(dbPosts.map((post) => [post.postId, post]));

    if (!facebookConnection) {
      const posts = dbPosts.map((post) => ({
        id: post.postId,
        message: post.message,
        permalink: post.permalink,
        imageUrl: post.imageUrl,
        link: post.link,
        postedAt: post.postedAt.toISOString(),
        source: 'cms' as const,
        createdBy: post.createdBy,
      }));
      return NextResponse.json({ posts });
    }

    const connectionData = JSON.parse(facebookConnection.value || '{}');

    const posts: Array<{
      id: string;
      message: string;
      permalink: string | null;
      imageUrl: string | null;
      link: string | null;
      postedAt: string;
      source: 'cms' | 'facebook';
      createdBy: string | null;
    }> = [];

    let pageToken: string | null = connectionData.accessToken || null;

    if (connectionData.connected && connectionData.userAccessToken && connectionData.pageId) {
      try {
        pageToken = await getPageAccessToken(connectionData.userAccessToken, connectionData.pageId);
      } catch (err) {
        console.warn('Unable to refresh page token for fetching posts:', err);
      }
    }

    if (connectionData.connected && connectionData.pageId && pageToken) {
      try {
        // Fetch posts from Facebook
        const graphResponse = await fetch(
          `https://graph.facebook.com/v18.0/${connectionData.pageId}/posts?` +
            `fields=id,message,permalink_url,full_picture,created_time&limit=25` +
            `&access_token=${pageToken}`,
          { method: 'GET' }
        );
        const graphData = await graphResponse.json();

        if (graphResponse.ok && Array.isArray(graphData.data)) {
          graphData.data.forEach((graphPost: any) => {
            const dbPost = dbPostMap.get(graphPost.id);
            posts.push({
              id: graphPost.id,
              message: (graphPost.message || dbPost?.message || '').trim(),
              permalink: graphPost.permalink_url || dbPost?.permalink || null,
              imageUrl: graphPost.full_picture || dbPost?.imageUrl || null,
              link: dbPost?.link || null,
              postedAt:
                graphPost.created_time ||
                dbPost?.postedAt?.toISOString() ||
                new Date().toISOString(),
              source: dbPost ? 'cms' : 'facebook',
              createdBy: dbPost?.createdBy || null,
            });

            if (dbPost) {
              dbPostMap.delete(graphPost.id);
            }
          });
        } else {
          console.warn('Failed to fetch posts from Facebook:', graphData);
        }

      } catch (err) {
        console.error('Error fetching posts from Facebook API:', err);
      }
    }

    // Add remaining CMS posts that were not returned by the Graph API call
    for (const dbPost of dbPostMap.values()) {
      posts.push({
        id: dbPost.postId,
        message: dbPost.message,
        permalink: dbPost.permalink,
        imageUrl: dbPost.imageUrl,
        link: dbPost.link,
        postedAt: dbPost.postedAt.toISOString(),
        source: 'cms',
        createdBy: dbPost.createdBy,
      });
    }

    posts.sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Facebook posts retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to load Facebook posts' },
      { status: 500 }
    );
  }
}

