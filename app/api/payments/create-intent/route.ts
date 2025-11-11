import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleError } from '@/lib/api-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Create Stripe Payment Intent
 * This endpoint creates a payment intent for the order
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, orderId, customerEmail, customerName } = body;

    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum charge is $0.50' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: orderId || '',
        customerEmail: customerEmail || '',
        customerName: customerName || '',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    return handleError(error, 'Failed to create payment intent');
  }
}

