import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Purchase Orders API
 * GET: List all purchase orders
 * POST: Create a new purchase order
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                supplierSku: true,
              },
            },
            ingredient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
      take: limit,
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleError(error, 'Failed to fetch purchase orders');
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
    const { supplierId, connectionId, items, requestedDate, notes, autoSubmit } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Supplier ID and items are required' },
        { status: 400 }
      );
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

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
        productId: item.productId || null,
        ingredientId: item.ingredientId || null,
        name: item.name,
        supplierSku: item.supplierSku || null,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        notes: item.notes || null,
      });
    }

    const tax = subtotal * 0.08; // Simplified tax calculation (8%)
    const shipping = 0; // Could be calculated based on supplier
    const total = subtotal + tax + shipping;

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        connectionId: connectionId || null,
        status: autoSubmit ? 'submitted' : 'draft',
        requestedDate: requestedDate ? new Date(requestedDate) : null,
        subtotal,
        tax,
        shipping,
        total,
        notes: notes || null,
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
      `created purchase order ${purchaseOrder.orderNumber} for ${supplier.name}`
    );

    // If auto-submit, attempt to place order with supplier API
    if (autoSubmit && connectionId) {
      // This would call the supplier API to place the order
      // For now, we'll just mark it as submitted
      // In production, this would call placeSupplierOrder()
    }

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create purchase order');
  }
}

