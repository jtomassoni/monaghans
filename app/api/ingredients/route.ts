import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active') === 'true';

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (activeOnly) {
      where.isActive = true;
    }

    const ingredients = await prisma.ingredient.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    return handleError(error, 'Failed to fetch ingredients');
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
    const ingredient = await prisma.ingredient.create({
      data: {
        name: body.name,
        category: body.category || 'Other',
        unit: body.unit,
        costPerUnit: parseFloat(body.costPerUnit),
        supplier: body.supplier || null,
        parLevel: body.parLevel ? parseFloat(body.parLevel) : null,
        currentStock: body.currentStock ? parseFloat(body.currentStock) : null,
        notes: body.notes || null,
        isActive: body.isActive ?? true,
      },
    });

    await logActivity(
      user.id,
      'create',
      'ingredient',
      ingredient.id,
      ingredient.name,
      undefined,
      `created ingredient "${ingredient.name}"`
    );

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create ingredient');
  }
}

