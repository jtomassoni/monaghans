import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const facebookConnection = await prisma.setting.findUnique({
      where: { key: 'facebook_connection' },
    });

    if (!facebookConnection) {
      return NextResponse.json({ connected: false });
    }

    const connectionData = JSON.parse(facebookConnection.value);

    if (!connectionData.connected || !connectionData.accessToken) {
      return NextResponse.json({ connected: false });
    }

    // Check if token is expired
    const isExpired = connectionData.expiresAt && new Date(connectionData.expiresAt) < new Date();

    return NextResponse.json({
      connected: true,
      expired: isExpired,
      pageId: connectionData.pageId,
      pageName: connectionData.pageName,
    });
  } catch (error) {
    console.error('Facebook status check error:', error);
    return NextResponse.json({ connected: false });
  }
}

