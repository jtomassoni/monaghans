import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

// Lazy initialization to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover',
  });
};

/**
 * Confirm Payment and Update Order
 * This endpoint confirms payment and updates the order status
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentIntentId, orderId } = body;

    if (!paymentIntentId || !orderId) {
      return NextResponse.json(
        { error: 'Missing paymentIntentId or orderId' },
        { status: 400 }
      );
    }

    // Retrieve payment intent from Stripe
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not succeeded. Status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // Update order with payment information
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'paid',
        paymentMethod: paymentIntent.payment_method_types[0] || 'card',
        stripePaymentId: paymentIntent.id,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ order, paymentIntent });
  } catch (error) {
    return handleError(error, 'Failed to confirm payment');
  }
}

