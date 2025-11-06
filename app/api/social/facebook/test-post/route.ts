import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { postToFacebook } from '@/lib/facebook-helpers';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const message = body.message || 'Test post from Monaghan\'s CMS';

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

    // Post to Facebook
    const postId = await postToFacebook(connectionData.accessToken, connectionData.pageId, {
      message,
    });

    return NextResponse.json({ success: true, postId });
  } catch (error) {
    console.error('Facebook test post error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to Facebook' },
      { status: 500 }
    );
  }
}

