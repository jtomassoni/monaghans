import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPageAccessToken } from '@/lib/facebook-helpers';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    if (!connectionData.pageId) {
      return NextResponse.json(
        { error: 'Facebook page ID missing from connection data.' },
        { status: 400 }
      );
    }

    // Check if user token is expired
    if (connectionData.userTokenExpiresAt && new Date(connectionData.userTokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Facebook connection expired. Please reconnect.' },
        { status: 400 }
      );
    }

    const diagnostics: any = {
      userTokenScopes: [],
      userTokenGranularScopes: [],
      pageTokenScopes: [],
      pageTokenGranularScopes: [],
      canReadPosts: false,
      hasManagePostsPermission: false,
    };

    let pageToken = connectionData.accessToken || '';

    // Debug: Check what permissions the user token has
    if (connectionData.userAccessToken) {
      try {
        const userTokenDebug = await fetch(
          `https://graph.facebook.com/v18.0/debug_token?` +
          `input_token=${connectionData.userAccessToken}` +
          `&access_token=${connectionData.userAccessToken}`,
          { method: 'GET' }
        );
        const userTokenData = await userTokenDebug.json();
        diagnostics.userTokenScopes = userTokenData.data?.scopes || [];
        diagnostics.userTokenGranularScopes = userTokenData.data?.granular_scopes || [];
        console.log('User token scopes:', diagnostics.userTokenScopes);
        console.log('User token granular_scopes:', JSON.stringify(diagnostics.userTokenGranularScopes, null, 2));
      } catch (err) {
        console.error('Error debugging user token:', err);
      }
    }

    try {
      if (connectionData.userAccessToken) {
        pageToken = await getPageAccessToken(connectionData.userAccessToken, connectionData.pageId);
      }
    } catch (err) {
      console.error('Failed to get fresh page token:', err);
    }

    if (!pageToken) {
      return NextResponse.json(
        { error: 'Unable to retrieve Facebook page token. Please reconnect.' },
        { status: 400 }
      );
    }

    // Inspect page token permissions
    try {
      const pageTokenDebug = await fetch(
        `https://graph.facebook.com/v18.0/debug_token?` +
        `input_token=${pageToken}` +
        `&access_token=${connectionData.userAccessToken || pageToken}`,
        { method: 'GET' }
      );
      const pageTokenData = await pageTokenDebug.json();
      diagnostics.pageTokenScopes = pageTokenData.data?.scopes || [];
      diagnostics.pageTokenGranularScopes = pageTokenData.data?.granular_scopes || [];
      console.log('Page token scopes:', diagnostics.pageTokenScopes);
    } catch (err) {
      console.error('Error debugging page token:', err);
    }

    // Check ability to read posts
    try {
      const readResponse = await fetch(
        `https://graph.facebook.com/v18.0/${connectionData.pageId}/posts?` +
        `limit=1&fields=id,message,created_time` +
        `&access_token=${pageToken}`,
        { method: 'GET' }
      );
      const readData = await readResponse.json();
      diagnostics.canReadPosts = readResponse.ok;
      if (!readResponse.ok) {
        console.warn('Read posts check failed:', readData);
      }
    } catch (err) {
      console.error('Error reading posts during connection test:', err);
    }

    const requiredPermissions = ['pages_read_engagement', 'pages_manage_posts'];
    diagnostics.hasManagePostsPermission = requiredPermissions.every((permission) =>
      diagnostics.pageTokenScopes.includes(permission)
    );

    const canPost =
      diagnostics.canReadPosts && diagnostics.hasManagePostsPermission;

    return NextResponse.json({
      success: canPost,
      diagnostics,
    });
  } catch (error) {
    console.error('Facebook test post error:', error);
    
    let errorMessage = 'Failed to test connection';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for permission errors and provide helpful guidance
      if (errorMessage.includes('pages_read_engagement') || errorMessage.includes('pages_manage_posts') || errorMessage.includes('permission')) {
        errorMessage = `${errorMessage}. Please disconnect and reconnect Facebook to grant the required permissions.`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

