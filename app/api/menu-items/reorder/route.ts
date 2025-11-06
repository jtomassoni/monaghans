import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to reorder menu items');
  }
}

