import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { forecastIngredientNeeds } from '@/lib/ai-insights-helpers';
import { forecastMenuItemDemand } from '@/lib/ai-insights-helpers';

/**
 * Auto-generate Purchase Orders API
 * POST: Generate purchase orders based on ingredient needs and forecasts
 */
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { supplierId, forecastDays = 7, autoSubmit = false } = body;

    // Get sales history for demand forecasting
    const salesHistory = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: ['completed', 'ready'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      },
      include: {
        menuItem: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
        order: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    // Get menu items
    const menuItems = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    // Forecast menu item demand
    const menuItemForecasts = forecastMenuItemDemand(
      salesHistory.map(item => ({
        menuItemId: item.menuItemId || '',
        menuItemName: item.name,
        quantity: item.quantity,
        date: item.order.createdAt,
      })),
      forecastDays
    );

    // Get menu item ingredients
    const menuItemIngredients = menuItems.flatMap(item =>
      item.ingredients.map(ing => ({
        menuItemId: item.id,
        ingredientId: ing.ingredient.id,
        ingredientName: ing.ingredient.name,
        quantity: ing.quantity,
        unit: ing.ingredient.unit,
      }))
    );

    // Get current stock levels
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        parLevel: true,
        unit: true,
        costPerUnit: true,
      },
    });

    // Forecast ingredient needs
    const ingredientForecasts = forecastIngredientNeeds(
      menuItemForecasts,
      menuItemIngredients,
      ingredients.map(ing => ({
        ingredientId: ing.id,
        currentStock: ing.currentStock,
        parLevel: ing.parLevel,
      })),
      forecastDays
    );

    // Get suppliers and their products
    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
        ...(supplierId ? { id: supplierId } : {}),
      },
      include: {
        products: {
          where: {
            isAvailable: true,
            ingredientId: { not: null },
          },
          include: {
            ingredient: true,
          },
        },
        connections: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    // Group forecasts by supplier
    const ordersBySupplier: Record<string, Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      productId: string;
      productName: string;
      unitPrice: number;
    }>> = {};

    for (const forecast of ingredientForecasts) {
      // Find best supplier product for this ingredient
      for (const supplier of suppliers) {
        const matchingProduct = supplier.products.find(
          p => p.ingredientId === forecast.ingredientId
        );

        if (matchingProduct) {
          if (!ordersBySupplier[supplier.id]) {
            ordersBySupplier[supplier.id] = [];
          }

          ordersBySupplier[supplier.id].push({
            ingredientId: forecast.ingredientId,
            ingredientName: forecast.ingredientName,
            quantity: forecast.recommendedOrderQuantity,
            unit: matchingProduct.unit,
            productId: matchingProduct.id,
            productName: matchingProduct.name,
            unitPrice: matchingProduct.currentPrice,
          });
          break; // Use first matching supplier
        }
      }
    }

    // Create purchase orders
    const createdOrders = [];
    for (const [supplierId, items] of Object.entries(ordersBySupplier)) {
      if (items.length === 0) continue;

      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) continue;

      // Generate order number
      const orderCount = await prisma.purchaseOrder.count();
      const orderNumber = `PO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const itemTotal = item.unitPrice * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: item.productId,
          ingredientId: item.ingredientId,
          name: item.productName,
          supplierSku: supplier.products.find(p => p.id === item.productId)?.supplierSku || null,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
        });
      }

      const tax = subtotal * 0.08; // Simplified tax calculation
      const shipping = 0;
      const total = subtotal + tax + shipping;

      // Create purchase order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId,
          connectionId: supplier.connections[0]?.id || null,
          status: autoSubmit ? 'submitted' : 'draft',
          requestedDate: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000),
          subtotal,
          tax,
          shipping,
          total,
          notes: `Auto-generated based on ${forecastDays}-day forecast`,
          items: {
            create: orderItems,
          },
        },
        include: {
          supplier: true,
          items: true,
        },
      });

      await logActivity(
        user.id,
        'create',
        'purchaseOrder',
        purchaseOrder.id,
        purchaseOrder.orderNumber,
        undefined,
        `auto-generated purchase order ${purchaseOrder.orderNumber} for ${supplier.name}`
      );

      createdOrders.push(purchaseOrder);
    }

    return NextResponse.json({
      success: true,
      orders: createdOrders,
      message: `Generated ${createdOrders.length} purchase order(s)`,
    });
  } catch (error) {
    return handleError(error, 'Failed to auto-generate purchase orders');
  }
}

