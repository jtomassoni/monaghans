import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { compareSupplierCosts, analyzeIngredientCost } from '@/lib/supplier-cost-helpers';

/**
 * Supplier Cost Comparison API
 * GET: Compare costs across suppliers for ingredients
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const ingredientId = searchParams.get('ingredientId');

    // Get all active ingredients
    const ingredients = await prisma.ingredient.findMany({
      where: {
        isActive: true,
        ...(ingredientId ? { id: ingredientId } : {}),
      },
      select: {
        id: true,
        name: true,
        unit: true,
        costPerUnit: true,
        category: true,
      },
    });

    // Get all supplier products
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: {
        isAvailable: true,
        supplier: {
          isActive: true,
        },
      },
      select: {
        id: true,
        supplierId: true,
        name: true,
        unit: true,
        currentPrice: true,
        minOrderQty: true,
        leadTimeDays: true,
        lastPriceUpdate: true,
        ingredientId: true,
        supplier: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    // Compare costs for each ingredient
    const comparisons = ingredients.map(ingredient => {
      const matchingProducts = supplierProducts
        .filter((p: any) => p.ingredientId === ingredient.id)
        .map((p: any) => ({
          id: p.id,
          supplierId: p.supplierId,
          supplierName: p.supplier.displayName || p.supplier.name,
          name: p.name,
          unit: p.unit,
          currentPrice: p.currentPrice,
          minOrderQty: p.minOrderQty || 1,
          leadTimeDays: p.leadTimeDays,
          lastPriceUpdate: p.lastPriceUpdate,
        }));

      return compareSupplierCosts(ingredient, matchingProducts);
    });

    // Sort by potential savings (highest first)
    comparisons.sort((a, b) => {
      const savingsA = a.bestPrice.savings || 0;
      const savingsB = b.bestPrice.savings || 0;
      return savingsB - savingsA;
    });

    return NextResponse.json({
      comparisons,
      totalIngredients: ingredients.length,
      ingredientsWithAlternatives: comparisons.filter(c => c.suppliers.length > 0).length,
    });
  } catch (error) {
    return handleError(error, 'Failed to compare supplier costs');
  }
}

