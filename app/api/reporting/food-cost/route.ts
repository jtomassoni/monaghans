import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import {
  calculateFoodCost,
  calculateFoodCostPercentage,
  parsePrice,
  formatCurrency,
  formatFoodCostPercentage,
  getFoodCostStatus,
} from '@/lib/food-cost-helpers';

/**
 * Food Cost Report API
 * Calculates food costs for all menu items and provides analysis
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId'); // Optional filter by section
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get all menu items with their ingredients
    const where: any = {};
    if (sectionId) {
      where.sectionId = sectionId;
    }
    if (!includeInactive) {
      where.isAvailable = true;
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        section: {
          select: {
            id: true,
            name: true,
            menuType: true,
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                costPerUnit: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: [
        { section: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // Calculate food costs for each item
    const itemsWithCosts = menuItems.map(item => {
      const foodCost = calculateFoodCost(item.ingredients);
      const menuPrice = parsePrice(item.price);
      const foodCostPercentage = calculateFoodCostPercentage(foodCost, item.price);
      const status = getFoodCostStatus(foodCostPercentage);

      return {
        id: item.id,
        name: item.name,
        section: item.section,
        price: item.price,
        menuPrice: menuPrice,
        priceNotes: item.priceNotes,
        isAvailable: item.isAvailable,
        prepTimeMin: item.prepTimeMin,
        foodCost,
        foodCostPercentage,
        status,
        ingredientCount: item.ingredients.length,
        ingredients: item.ingredients.map(miIng => ({
          id: miIng.id,
          ingredient: {
            id: miIng.ingredient.id,
            name: miIng.ingredient.name,
            unit: miIng.ingredient.unit,
            costPerUnit: miIng.ingredient.costPerUnit,
          },
          quantity: miIng.quantity,
          notes: miIng.notes,
          cost: miIng.ingredient.costPerUnit * miIng.quantity,
        })),
      };
    });

    // Calculate summary statistics
    const itemsWithPrices = itemsWithCosts.filter(item => item.menuPrice !== null && item.menuPrice > 0);
    const totalFoodCost = itemsWithCosts.reduce((sum, item) => sum + item.foodCost, 0);
    const totalMenuValue = itemsWithPrices.reduce((sum, item) => sum + (item.menuPrice || 0), 0);
    const averageFoodCost = itemsWithCosts.length > 0 ? totalFoodCost / itemsWithCosts.length : 0;
    const averageFoodCostPercentage = itemsWithPrices.length > 0
      ? itemsWithPrices.reduce((sum, item) => sum + (item.foodCostPercentage || 0), 0) / itemsWithPrices.length
      : null;

    // Group by status
    const byStatus = {
      good: itemsWithCosts.filter(item => item.status === 'good'),
      acceptable: itemsWithCosts.filter(item => item.status === 'acceptable'),
      high: itemsWithCosts.filter(item => item.status === 'high'),
      unknown: itemsWithCosts.filter(item => item.status === 'unknown'),
    };

    // Sort by food cost percentage (highest first)
    const sortedByPercentage = [...itemsWithPrices].sort((a, b) => {
      const aPct = a.foodCostPercentage || 0;
      const bPct = b.foodCostPercentage || 0;
      return bPct - aPct;
    });

    // Get sections for filtering
    const sections = await prisma.menuSection.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        menuType: true,
      },
    });

    return NextResponse.json({
      summary: {
        totalItems: itemsWithCosts.length,
        itemsWithPrices: itemsWithPrices.length,
        itemsWithoutPrices: itemsWithCosts.length - itemsWithPrices.length,
        totalFoodCost,
        totalMenuValue,
        averageFoodCost,
        averageFoodCostPercentage,
        byStatus: {
          good: byStatus.good.length,
          acceptable: byStatus.acceptable.length,
          high: byStatus.high.length,
          unknown: byStatus.unknown.length,
        },
      },
      items: itemsWithCosts,
      sortedByPercentage: sortedByPercentage.slice(0, 20), // Top 20 highest percentages
      byStatus,
      sections,
    });
  } catch (error) {
    return handleError(error, 'Failed to generate food cost report');
  }
}

