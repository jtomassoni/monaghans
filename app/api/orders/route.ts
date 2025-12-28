import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';
import { calculateTipDistribution } from '@/lib/order-helpers';
import { verifyRecaptcha } from '@/lib/recaptcha-verify';

/**
 * Orders API
 * Create and manage orders
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupTime,
      specialInstructions,
      items,
      subtotal,
      tax,
      tip = 0,
      total,
      recaptchaToken,
    } = body;

    // Verify reCAPTCHA if configured
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 400 }
        );
      }

      const verification = await verifyRecaptcha(
        recaptchaToken,
        process.env.RECAPTCHA_SECRET_KEY
      );

      if (!verification.success) {
        console.error('reCAPTCHA verification failed:', verification.error);
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate tip distribution
    const { bohTip, fohTip } = calculateTipDistribution(tip);

    // Generate order number
    const year = new Date().getFullYear();
    const orderCount = await prisma.order.count({
      where: {
        orderNumber: {
          startsWith: `ORD-${year}-`,
        },
      },
    });
    const orderNumber = `ORD-${year}-${String(orderCount + 1).padStart(4, '0')}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        pickupTime: pickupTime ? new Date(pickupTime) : null,
        specialInstructions,
        subtotal,
        tax,
        tip,
        bohTip,
        fohTip,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        items: {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
            specialInstructions: item.specialInstructions || null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Automatically print to kitchen printer when order is created
    try {
      const printResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/printers/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          printerType: 'kitchen',
        }),
      });
      // Don't fail the order if printing fails
      if (!printResponse.ok) {
        console.error('Failed to print order ticket:', await printResponse.text());
      }
    } catch (printError) {
      console.error('Error sending print job:', printError);
      // Continue even if printing fails
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create order');
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const email = searchParams.get('email');

    const where: any = {};
    // Only filter by status if it's a valid status value (not 'all')
    if (status && status !== 'all') {
      where.status = status;
    }
    if (email) {
      where.customerEmail = email;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleError(error, 'Failed to fetch orders');
  }
}

