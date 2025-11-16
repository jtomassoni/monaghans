import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { placeSupplierOrder } from '@/lib/supplier-helpers';

/**
 * Purchase Order API
 * GET: Get purchase order by ID
 * PUT: Update purchase order
 * POST: Submit purchase order to supplier
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
            ingredient: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return handleError(error, 'Failed to fetch purchase order');
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
    const { status, requestedDate, notes, items } = body;

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Can't edit submitted/confirmed orders
    if (existing.status !== 'draft' && status === 'draft') {
      return NextResponse.json(
        { error: 'Cannot revert order to draft status' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (requestedDate) updateData.requestedDate = new Date(requestedDate);
    if (notes !== undefined) updateData.notes = notes;

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        items: true,
      },
    });

    await logActivity(
      user.id,
      'update',
      'purchaseOrder',
      order.id,
      order.orderNumber,
      undefined,
      `updated purchase order ${order.orderNumber}`
    );

    return NextResponse.json(order);
  } catch (error) {
    return handleError(error, 'Failed to update purchase order');
  }
}

/**
 * Submit purchase order to supplier API
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
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (order.status !== 'draft') {
      return NextResponse.json(
        { error: 'Order has already been submitted' },
        { status: 400 }
      );
    }

    // Get connection
    let connection = null;
    if (order.connectionId) {
      connection = await prisma.supplierConnection.findUnique({
        where: { id: order.connectionId },
      });
    } else {
      connection = await prisma.supplierConnection.findFirst({
        where: { supplierId: order.supplierId, isActive: true },
      });
    }

    if (!connection) {
      return NextResponse.json(
        { error: 'No active connection found for this supplier' },
        { status: 400 }
      );
    }

    // Prepare order for supplier API
    const credentials = JSON.parse(connection.credentials);
    const orderRequest = {
      items: order.items.map(item => ({
        sku: item.product?.supplierSku || item.supplierSku || '',
        quantity: item.quantity,
        unit: item.unit,
      })),
      requestedDate: order.requestedDate || undefined,
      notes: order.notes || undefined,
    };

    // Submit to supplier API
    try {
      const response = await placeSupplierOrder(
        order.supplier.provider,
        credentials,
        orderRequest
      );

      // Update order with supplier response
      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: response.status === 'confirmed' ? 'confirmed' : 'submitted',
          posOrderId: response.orderId,
        },
      });

      await logActivity(
        user.id,
        'update',
        'purchaseOrder',
        order.id,
        order.orderNumber,
        undefined,
        `submitted purchase order ${order.orderNumber} to ${order.supplier.name}`
      );

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        supplierResponse: response,
      });
    } catch (apiError: any) {
      // Update order status to show error
      await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: 'draft', // Keep as draft if submission failed
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to submit order to supplier',
          details: apiError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleError(error, 'Failed to submit purchase order');
  }
}

