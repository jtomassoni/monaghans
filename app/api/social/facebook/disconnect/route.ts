import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clear Facebook connection
    await prisma.setting.deleteMany({
      where: { key: 'facebook_connection' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Facebook disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Facebook' },
      { status: 500 }
    );
  }
}

