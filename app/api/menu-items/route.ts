import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');
    const activeOnly = searchParams.get('active') === 'true';

    const where: any = {};
    if (sectionId) {
      where.sectionId = sectionId;
    }
    if (activeOnly) {
      where.isAvailable = true;
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        section: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    return handleError(error, 'Failed to fetch menu items');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const item = await prisma.menuItem.create({
      data: {
        sectionId: body.sectionId,
        name: body.name,
        description: body.description,
        price: body.price,
        priceNotes: body.priceNotes,
        modifiers: body.modifiers ? JSON.stringify(body.modifiers) : null,
        isAvailable: body.isAvailable ?? true,
        displayOrder: body.displayOrder ?? 0,
        prepTimeMin: body.prepTimeMin ? parseInt(body.prepTimeMin) : null,
      },
      include: {
        section: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    await logActivity(
      user.id,
      'create',
      'menuItem',
      item.id,
      item.name,
      undefined,
      `created menu item "${item.name}"`
    );

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create menu item');
  }
}

