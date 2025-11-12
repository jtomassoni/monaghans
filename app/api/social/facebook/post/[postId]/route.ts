import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { editFacebookPost, deleteFacebookPost, getPageAccessToken } from '@/lib/facebook-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { postId } = await params;
    const body = await req.json();
    const { message } = body;

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

    if (!connectionData.connected) {
      return NextResponse.json(
        { error: 'Facebook connection invalid' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (connectionData.userTokenExpiresAt && new Date(connectionData.userTokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Facebook connection expired. Please reconnect.' },
        { status: 400 }
      );
    }

    // Edit the post on Facebook
    await editFacebookPost(
      connectionData.accessToken || '',
      postId,
      message,
      connectionData.userAccessToken
    );

    // Update the post in our database
    try {
      let pageToken = connectionData.accessToken || '';
      if (connectionData.userAccessToken) {
        try {
          pageToken = await getPageAccessToken(connectionData.userAccessToken, connectionData.pageId);
        } catch (refreshError) {
          console.warn('Failed to refresh page token for post metadata:', refreshError);
        }
      }

      // Fetch updated post details from Facebook
      const detailsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?` +
        `fields=id,permalink_url,full_picture,message,created_time` +
        `&access_token=${pageToken}`,
        { method: 'GET' }
      );
      const detailsData = await detailsResponse.json();

      if (detailsResponse.ok) {
        await prisma.facebookPost.upsert({
          where: { postId },
          update: {
            message: (detailsData.message || message).trim(),
          },
          create: {
            postId,
            pageId: connectionData.pageId,
            message: (detailsData.message || message).trim(),
            permalink: detailsData.permalink_url || null,
            imageUrl: detailsData.full_picture || null,
            createdBy: session.user?.id || null,
            postedAt: detailsData.created_time ? new Date(detailsData.created_time) : new Date(),
          },
        });
      }
    } catch (persistError) {
      console.error('Failed to update Facebook post metadata:', persistError);
      // Don't fail the request if we can't update the database
    }

    return NextResponse.json({ 
      success: true,
      message: 'Post updated successfully on Facebook'
    });
  } catch (error) {
    console.error('Facebook post edit error:', error);
    
    let errorMessage = 'Failed to edit post on Facebook';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide helpful error messages for common cases
      if (errorMessage.includes('OAuthException') || errorMessage.includes('Error 200') || errorMessage.includes('expired or invalid')) {
        errorMessage = 'Facebook access token expired or invalid. Please reconnect your Facebook account in the settings.';
      } else if (errorMessage.includes('time limit') || errorMessage.includes('24 hours')) {
        errorMessage = 'Posts can only be edited within 24 hours of posting.';
      } else if (errorMessage.includes('permission')) {
        errorMessage = 'You do not have permission to edit this post.';
      } else if (errorMessage.includes('not exist') || errorMessage.includes('not found')) {
        errorMessage = 'Post not found or has been deleted from Facebook.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { postId } = await params;

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

    if (!connectionData.connected) {
      return NextResponse.json(
        { error: 'Facebook connection invalid' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (connectionData.userTokenExpiresAt && new Date(connectionData.userTokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Facebook connection expired. Please reconnect.' },
        { status: 400 }
      );
    }

    // Delete the post on Facebook
    await deleteFacebookPost(
      connectionData.accessToken || '',
      postId,
      connectionData.userAccessToken
    );

    // Delete the post from our database
    try {
      await prisma.facebookPost.delete({
        where: { postId },
      });
    } catch (dbError) {
      console.error('Failed to delete post from database:', dbError);
      // Don't fail the request if we can't delete from database (post is already deleted on Facebook)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Post deleted successfully from Facebook'
    });
  } catch (error) {
    console.error('Facebook post delete error:', error);
    
    let errorMessage = 'Failed to delete post on Facebook';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide helpful error messages for common cases
      if (errorMessage.includes('OAuthException') || errorMessage.includes('Error 200') || errorMessage.includes('expired or invalid')) {
        errorMessage = 'Facebook access token expired or invalid. Please reconnect your Facebook account in the settings.';
      } else if (errorMessage.includes('permission')) {
        errorMessage = 'You do not have permission to delete this post.';
      } else if (errorMessage.includes('not exist')) {
        errorMessage = 'Post not found or already deleted.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
