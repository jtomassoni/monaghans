import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Order Item Management API
 * Update individual order items
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const { quantity, modifiers, specialInstructions } = body;

    // Get current order item
    const currentItem = await prisma.orderItem.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (quantity !== undefined) {
      if (quantity < 1) {
        return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
      }
      updateData.quantity = quantity;
    }
    if (modifiers !== undefined) {
      updateData.modifiers = modifiers ? JSON.stringify(modifiers) : null;
    }
    if (specialInstructions !== undefined) {
      updateData.specialInstructions = specialInstructions || null;
    }

    // Update the order item
    const updatedItem = await prisma.orderItem.update({
      where: { id },
      data: updateData,
    });

    // Recalculate order totals
    const order = await prisma.order.findUnique({
      where: { id: currentItem.orderId },
      include: { items: true },
    });

    if (order) {
      const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.08; // Assuming 8% tax
      const total = subtotal + tax + (order.tip || 0);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          subtotal,
          tax,
          total,
        },
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    return handleError(error, 'Failed to update order item');
  }
}

