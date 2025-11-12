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

        // Check for OAuth errors
        if (graphData.error) {
          if (graphData.error.code === 200 || graphData.error.type === 'OAuthException') {
            console.warn('OAuth error when fetching posts - token may be expired:', graphData.error);
            // Continue with just DB posts if OAuth fails
          } else {
            console.warn('Failed to fetch posts from Facebook:', graphData);
          }
        } else if (graphResponse.ok && Array.isArray(graphData.data)) {
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
        }

      } catch (err) {
        console.error('Error fetching posts from Facebook API:', err);
      }
    }

    // Verify remaining CMS posts still exist on Facebook before including them
    // This prevents showing deleted posts
    if (connectionData.connected && connectionData.pageId && pageToken && dbPostMap.size > 0) {
      const postsToVerify = Array.from(dbPostMap.values());
      const verifiedPosts: typeof postsToVerify = [];
      
      // Verify posts in batches to avoid rate limits
      for (const dbPost of postsToVerify) {
        try {
          const verifyResponse = await fetch(
            `https://graph.facebook.com/v18.0/${dbPost.postId}?` +
              `fields=id&access_token=${pageToken}`,
            { method: 'GET' }
          );
          const verifyData = await verifyResponse.json();
          
          // If post exists on Facebook, include it
          if (verifyResponse.ok && verifyData.id) {
            verifiedPosts.push(dbPost);
          } else {
            // Post doesn't exist on Facebook (deleted), remove from database
            console.log(`Post ${dbPost.postId} not found on Facebook, removing from database`);
            try {
              await prisma.facebookPost.delete({
                where: { postId: dbPost.postId },
              }).catch(() => {
                // Ignore errors if post already deleted
              });
            } catch (deleteErr) {
              // Ignore database errors
            }
          }
        } catch (verifyErr) {
          // If verification fails (e.g., OAuth error), include the post anyway
          // to avoid losing data if it's just a temporary API issue
          verifiedPosts.push(dbPost);
        }
      }
      
      // Add verified posts
      for (const dbPost of verifiedPosts) {
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
    } else if (dbPostMap.size > 0) {
      // If we can't verify (no connection or token), include all DB posts
      // This maintains backward compatibility when Facebook isn't connected
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

