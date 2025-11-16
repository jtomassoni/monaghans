import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser } from '@/lib/api-helpers';
import { syncSupplierCatalog, matchProductsToIngredients } from '@/lib/supplier-helpers';

/**
 * Supplier Catalog Sync API
 * POST: Sync product catalog from supplier API
 */
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

    const { id } = await params;
    const body = await req.json();
    const connectionId = body.connectionId;

    // Get supplier and connection
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    let connection = null;
    if (connectionId) {
      connection = await prisma.supplierConnection.findUnique({
        where: { id: connectionId, supplierId: id },
      });
      if (!connection) {
        return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
      }
    } else {
      // Use first active connection
      connection = await prisma.supplierConnection.findFirst({
        where: { supplierId: id, isActive: true },
      });
    }

    if (!connection) {
      return NextResponse.json(
        { error: 'No active connection found for this supplier' },
        { status: 400 }
      );
    }

    // Parse credentials
    const credentials = JSON.parse(connection.credentials);

    // Sync catalog from supplier API
    const products = await syncSupplierCatalog(supplier.provider, credentials);

    // Get all ingredients for matching
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    // Match products to ingredients
    const matches = matchProductsToIngredients(products, ingredients);

    // Upsert products
    let syncedCount = 0;
    let matchedCount = 0;

    for (const match of matches) {
      const product = match.product;
      
      // Check if product already exists
      const existing = await prisma.supplierProduct.findUnique({
        where: {
          supplierId_supplierSku: {
            supplierId: id,
            supplierSku: product.sku,
          },
        },
      });

      if (existing) {
        // Update existing product
        await prisma.supplierProduct.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            description: product.description || null,
            category: product.category || null,
            unit: product.unit,
            unitSize: product.unitSize || null,
            currentPrice: product.price,
            lastPriceUpdate: new Date(),
            isAvailable: product.isAvailable,
            minOrderQty: product.minOrderQty || null,
            leadTimeDays: product.leadTimeDays || null,
            ingredientId: match.ingredientId || null,
          },
        });

        // Record price change if different
        if (existing.currentPrice !== product.price) {
          await prisma.supplierPricing.create({
            data: {
              supplierId: id,
              productId: existing.id,
              price: product.price,
              effectiveDate: new Date(),
            },
          });
        }
      } else {
        // Create new product
        await prisma.supplierProduct.create({
          data: {
            supplierId: id,
            supplierSku: product.sku,
            name: product.name,
            description: product.description || null,
            category: product.category || null,
            unit: product.unit,
            unitSize: product.unitSize || null,
            currentPrice: product.price,
            lastPriceUpdate: new Date(),
            isAvailable: product.isAvailable,
            minOrderQty: product.minOrderQty || null,
            leadTimeDays: product.leadTimeDays || null,
            ingredientId: match.ingredientId || null,
          },
        });
      }

      syncedCount++;
      if (match.ingredientId) matchedCount++;
    }

    // Update connection sync timestamp
    await prisma.supplierConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    return NextResponse.json({
      success: true,
      syncedCount,
      matchedCount,
      message: `Synced ${syncedCount} products, matched ${matchedCount} to ingredients`,
    });
  } catch (error: any) {
    // Update connection with error
    const { id } = await params;
    const connection = await prisma.supplierConnection.findFirst({
      where: { supplierId: id, isActive: true },
    });
    
    if (connection) {
      await prisma.supplierConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncError: error.message || 'Unknown error',
        },
      });
    }

    return handleError(error, 'Failed to sync catalog');
  }
}

