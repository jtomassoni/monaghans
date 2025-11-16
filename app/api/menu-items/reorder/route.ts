import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request: items must be an array' },
        { status: 400 }
      );
    }

    // Update all items in a transaction
    await prisma.$transaction(
      items.map((item: { id: string; displayOrder: number }) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    );

    // Log activity for reordering
    await logActivity(
      user.id,
      'update',
      'menuItem',
      'multiple',
      `${items.length} items`,
      undefined,
      `reordered ${items.length} menu item${items.length === 1 ? '' : 's'}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to reorder menu items');
  }
}

