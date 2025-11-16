import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const menuType = searchParams.get('type'); // "breakfast", "dinner", or null for all
    const activeOnly = searchParams.get('active') === 'true';

    const where: any = {};
    if (menuType) {
      where.menuType = {
        in: [menuType, 'both'],
      };
    }
    if (activeOnly) {
      where.isActive = true;
    }

    const sections = await prisma.menuSection.findMany({
      where,
      include: {
        items: {
          where: activeOnly ? { isAvailable: true } : {},
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(sections);
  } catch (error) {
    return handleError(error, 'Failed to fetch menu sections');
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
    const section = await prisma.menuSection.create({
      data: {
        name: body.name,
        description: body.description,
        displayOrder: body.displayOrder ?? 0,
        menuType: body.menuType || 'dinner',
        isActive: body.isActive ?? true,
      },
    });

    await logActivity(
      user.id,
      'create',
      'menuSection',
      section.id,
      section.name,
      undefined,
      `created menu section "${section.name}"`
    );

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create menu section');
  }
}

