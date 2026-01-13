import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        section: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    return handleError(error, 'Failed to fetch menu item');
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

    // Get the current item to compare changes
    const currentItem = await prisma.menuItem.findUnique({
      where: { id },
      include: { section: true },
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Try to include ingredients, but fallback if table doesn't exist
    let item;
    try {
      item = await prisma.menuItem.update({
        where: { id },
        data: {
          sectionId: body.sectionId,
          name: body.name,
          description: body.description,
          price: body.price,
          priceNotes: body.priceNotes,
          modifiers: body.modifiers ? JSON.stringify(body.modifiers) : null,
          isAvailable: body.isAvailable,
          displayOrder: body.displayOrder,
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
    } catch (error: any) {
      // If table doesn't exist (P2021), retry without ingredients include
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        item = await prisma.menuItem.update({
          where: { id },
          data: {
            sectionId: body.sectionId,
            name: body.name,
            description: body.description,
            price: body.price,
            priceNotes: body.priceNotes,
            modifiers: body.modifiers ? JSON.stringify(body.modifiers) : null,
            isAvailable: body.isAvailable,
            displayOrder: body.displayOrder,
            prepTimeMin: body.prepTimeMin ? parseInt(body.prepTimeMin) : null,
          },
          include: {
            section: true,
          },
        });
        // Add empty ingredients array for consistency
        item = { ...item, ingredients: [] };
      } else {
        throw error;
      }
    }

    // Build changes object
    const changes: Record<string, { before: any; after: any }> = {};
    if (currentItem.name !== body.name) changes.name = { before: currentItem.name, after: body.name };
    if (currentItem.description !== body.description) changes.description = { before: currentItem.description || '', after: body.description || '' };
    if (currentItem.price !== body.price) changes.price = { before: currentItem.price || '', after: body.price || '' };
    if (currentItem.priceNotes !== body.priceNotes) changes.priceNotes = { before: currentItem.priceNotes || '', after: body.priceNotes || '' };
    if (currentItem.isAvailable !== body.isAvailable) changes.isAvailable = { before: currentItem.isAvailable, after: body.isAvailable };
    if (currentItem.sectionId !== body.sectionId) {
      const oldSection = await prisma.menuSection.findUnique({ where: { id: currentItem.sectionId } });
      const newSection = await prisma.menuSection.findUnique({ where: { id: body.sectionId } });
      changes.section = { before: oldSection?.name || '', after: newSection?.name || '' };
    }

    await logActivity(
      user.id,
      'update',
      'menuItem',
      item.id,
      item.name,
      Object.keys(changes).length > 0 ? changes : undefined,
      `updated menu item "${item.name}"`
    );

    return NextResponse.json(item);
  } catch (error) {
    return handleError(error, 'Failed to update menu item');
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
    const item = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    await prisma.menuItem.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'menuItem',
      id,
      item.name,
      undefined,
      `deleted menu item "${item.name}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete menu item');
  }
}

