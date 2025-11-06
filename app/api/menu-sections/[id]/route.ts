import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

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
    const { id } = await params;
    const body = await req.json();

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
    const { id } = await params;
    await prisma.menuSection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete menu section');
  }
}

