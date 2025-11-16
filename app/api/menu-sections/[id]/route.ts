import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const section = await prisma.menuSection.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: 'Menu section not found' }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error) {
    return handleError(error, 'Failed to fetch menu section');
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Get existing section to track changes
    const currentSection = await prisma.menuSection.findUnique({
      where: { id },
    });

    if (!currentSection) {
      return NextResponse.json({ error: 'Menu section not found' }, { status: 404 });
    }

    const section = await prisma.menuSection.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        displayOrder: body.displayOrder,
        menuType: body.menuType,
        isActive: body.isActive,
      },
    });

    // Track changes
    const changes: Record<string, { before: any; after: any }> = {};
    if (currentSection.name !== section.name) changes.name = { before: currentSection.name, after: section.name };
    if (currentSection.description !== section.description) changes.description = { before: currentSection.description || '(empty)', after: section.description || '(empty)' };
    if (currentSection.displayOrder !== section.displayOrder) changes.displayOrder = { before: currentSection.displayOrder, after: section.displayOrder };
    if (currentSection.menuType !== section.menuType) changes.menuType = { before: currentSection.menuType, after: section.menuType };
    if (currentSection.isActive !== section.isActive) changes.isActive = { before: currentSection.isActive, after: section.isActive };

    await logActivity(
      user.id,
      'update',
      'menuSection',
      section.id,
      section.name,
      Object.keys(changes).length > 0 ? changes : undefined,
      `updated menu section "${section.name}"`
    );

    return NextResponse.json(section);
  } catch (error) {
    return handleError(error, 'Failed to update menu section');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const section = await prisma.menuSection.findUnique({
      where: { id },
    });

    if (!section) {
      return NextResponse.json({ error: 'Menu section not found' }, { status: 404 });
    }

    await prisma.menuSection.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'menuSection',
      id,
      section.name,
      undefined,
      `deleted menu section "${section.name}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete menu section');
  }
}

