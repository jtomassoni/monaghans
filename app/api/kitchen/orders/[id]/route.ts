import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

/**
 * Kitchen Order API
 * Allows kitchen staff to update order statuses without admin auth
 * Uses simple token-based auth (in production, use proper JWT)
 */

// Simple kitchen auth check (in production, use proper JWT tokens)
function checkKitchenAuth(req: NextRequest): boolean {
  // For now, we'll allow this endpoint to be called from authenticated kitchen sessions
  // In production, implement proper JWT token validation
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Simple check - in production, validate JWT token
    return token === process.env.KITCHEN_API_TOKEN || token === 'kitchen-token-dev';
  }
  // For development, allow if no auth header (will be protected by middleware in production)
  return process.env.NODE_ENV !== 'production';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check kitchen auth
  if (!checkKitchenAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return handleError(error, 'Failed to fetch order');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check kitchen auth
  if (!checkKitchenAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Kitchen can acknowledge orders and advance through BOH workflow
    const validStatuses = ['acknowledged', 'preparing', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status for kitchen' }, { status: 400 });
    }

    // Get current order
    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Ensure order is in BOH workflow (confirmed or beyond)
    if (!['confirmed', 'acknowledged', 'preparing', 'ready'].includes(currentOrder.status)) {
      return NextResponse.json({ error: 'Order not in kitchen workflow' }, { status: 400 });
    }

    const updateData: any = { status };
    const now = new Date();

    // Track timing fields
    if (status === 'acknowledged' && currentOrder.status !== 'acknowledged') {
      updateData.acknowledgedAt = now;
    } else if (status === 'preparing' && currentOrder.status !== 'preparing') {
      updateData.preparingAt = now;
    } else if (status === 'ready' && currentOrder.status !== 'ready') {
      updateData.readyAt = now;
    } else if (status === 'completed') {
      updateData.completedAt = now;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    return handleError(error, 'Failed to update order');
  }
}

