import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        menuItems: {
          include: {
            menuItem: {
              include: {
                section: true,
              },
            },
          },
        },
      },
    });

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    return handleError(error, 'Failed to fetch ingredient');
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

    const currentIngredient = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!currentIngredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category || 'Other',
        unit: body.unit,
        costPerUnit: parseFloat(body.costPerUnit),
        supplier: body.supplier || null,
        parLevel: body.parLevel ? parseFloat(body.parLevel) : null,
        currentStock: body.currentStock ? parseFloat(body.currentStock) : null,
        notes: body.notes || null,
        isActive: body.isActive,
      },
    });

    // Build changes object
    const changes: Record<string, { before: any; after: any }> = {};
    if (currentIngredient.name !== body.name) changes.name = { before: currentIngredient.name, after: body.name };
    if (currentIngredient.category !== body.category) changes.category = { before: currentIngredient.category, after: body.category };
    if (currentIngredient.costPerUnit !== parseFloat(body.costPerUnit)) {
      changes.costPerUnit = { before: currentIngredient.costPerUnit, after: parseFloat(body.costPerUnit) };
    }

    await logActivity(
      user.id,
      'update',
      'ingredient',
      ingredient.id,
      ingredient.name,
      changes,
      `updated ingredient "${ingredient.name}"`
    );

    return NextResponse.json(ingredient);
  } catch (error) {
    return handleError(error, 'Failed to update ingredient');
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
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    await prisma.ingredient.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'ingredient',
      id,
      ingredient.name,
      undefined,
      `deleted ingredient "${ingredient.name}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete ingredient');
  }
}

