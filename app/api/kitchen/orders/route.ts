import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

/**
 * Kitchen Orders API
 * Allows kitchen staff to fetch orders without admin auth
 */

// Simple kitchen auth check
function checkKitchenAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token === process.env.KITCHEN_API_TOKEN || token === 'kitchen-token-dev';
  }
  return process.env.NODE_ENV !== 'production';
}

export async function GET(req: NextRequest) {
  // Check kitchen auth
  if (!checkKitchenAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleError(error, 'Failed to fetch orders');
  }
}

