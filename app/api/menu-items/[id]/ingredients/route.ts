import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

// GET: Fetch all ingredients for a menu item
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ingredients = await prisma.menuItemIngredient.findMany({
      where: { menuItemId: id },
      include: {
        ingredient: true,
      },
      orderBy: {
        ingredient: {
          name: 'asc',
        },
      },
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    return handleError(error, 'Failed to fetch menu item ingredients');
  }
}

// POST: Add or update ingredients for a menu item
export async function POST(
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

    const { id: menuItemId } = await params;
    const body = await req.json();
    const { ingredients } = body; // Array of { ingredientId, quantity, notes }

    // Verify menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Delete all existing ingredients for this menu item
    await prisma.menuItemIngredient.deleteMany({
      where: { menuItemId },
    });

    // Create new ingredient associations
    if (ingredients && ingredients.length > 0) {
      await prisma.menuItemIngredient.createMany({
        data: ingredients.map((ing: { ingredientId: string; quantity: number; notes?: string }) => ({
          menuItemId,
          ingredientId: ing.ingredientId,
          quantity: parseFloat(ing.quantity.toString()),
          notes: ing.notes || null,
        })),
      });
    }

    await logActivity(
      user.id,
      'update',
      'menuItem',
      menuItemId,
      menuItem.name,
      undefined,
      `updated ingredients for "${menuItem.name}"`
    );

    // Return updated list
    const updatedIngredients = await prisma.menuItemIngredient.findMany({
      where: { menuItemId },
      include: {
        ingredient: true,
      },
    });

    return NextResponse.json(updatedIngredients);
  } catch (error) {
    return handleError(error, 'Failed to update menu item ingredients');
  }
}

