import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

/**
 * Print Preview API
 * Generates print data for preview/QA purposes without actually printing
 */

// Generate ESC/POS print commands for order ticket (same as print route)
function generateOrderTicket(order: any): string {
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';

  let commands = '';

  // Initialize printer
  commands += ESC + '@'; // Reset printer

  // Center align and double size for header
  commands += ESC + 'a' + '\x01'; // Center align
  commands += ESC + '!' + '\x30'; // Double width and height
  commands += 'ORDER TICKET' + LF;
  commands += ESC + '!' + '\x00'; // Reset text size
  commands += LF;

  // Order number
  commands += ESC + 'a' + '\x01'; // Center align
  commands += ESC + '!' + '\x10'; // Double width
  commands += `#${order.orderNumber}` + LF;
  commands += ESC + '!' + '\x00'; // Reset text size
  commands += LF;

  // Customer info
  commands += ESC + 'a' + '\x00'; // Left align
  commands += 'Customer: ' + order.customerName + LF;
  commands += 'Phone: ' + order.customerPhone + LF;
  if (order.pickupTime) {
    const pickupTime = new Date(order.pickupTime).toLocaleString();
    commands += 'Pickup: ' + pickupTime + LF;
  } else {
    commands += 'Pickup: ASAP' + LF;
  }
  commands += LF;

  // Items
  commands += '--------------------------------' + LF;
  commands += ESC + '!' + '\x08'; // Emphasized
  commands += 'ITEMS:' + LF;
  commands += ESC + '!' + '\x00'; // Reset
  commands += '--------------------------------' + LF;

  order.items.forEach((item: any) => {
    commands += `${item.quantity}x ${item.name}` + LF;
    if (item.modifiers) {
      try {
        const modifiers = JSON.parse(item.modifiers);
        if (Array.isArray(modifiers) && modifiers.length > 0) {
          modifiers.forEach((mod: string) => {
            commands += '  - ' + mod + LF;
          });
        }
      } catch {}
    }
    if (item.specialInstructions) {
      commands += '  NOTE: ' + item.specialInstructions + LF;
    }
    commands += LF;
  });

  // Special instructions
  if (order.specialInstructions) {
    commands += '--------------------------------' + LF;
    commands += ESC + '!' + '\x08'; // Emphasized
    commands += 'ORDER NOTE:' + LF;
    commands += ESC + '!' + '\x00'; // Reset
    commands += order.specialInstructions + LF;
    commands += '--------------------------------' + LF;
    commands += LF;
  }

  // Footer
  commands += ESC + 'a' + '\x01'; // Center align
  commands += new Date().toLocaleString() + LF;
  commands += LF;

  // Cut paper
  commands += GS + 'V' + '\x41' + '\x03';

  return commands;
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate print data
    const printData = generateOrderTicket(order);

    return NextResponse.json({
      success: true,
      printData,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
      },
    });
  } catch (error) {
    return handleError(error, 'Failed to generate print preview');
  }
}

