'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
  specialInstructions?: string;
}

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Payment form component
function PaymentForm({
  cart,
  formData,
  pickupOption,
  onSuccess,
  onError,
}: {
  cart: CartItem[];
  formData: any;
  pickupOption: 'asap' | 'later';
  onSuccess: (orderId: string) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const orderCreatedRef = useRef(false);

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      onError('Stripe is not loaded. Please refresh the page.');
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      // Step 1: Create order first
      let orderId: string;
      if (!orderCreatedRef.current) {
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            pickupTime: pickupOption === 'asap' ? null : formData.pickupTime,
            items: cart,
            subtotal: calculateSubtotal(),
            tax: calculateTax(),
            total: calculateTotal(),
          }),
        });

        if (!orderResponse.ok) {
          const error = await orderResponse.json();
          throw new Error(error.error || 'Failed to create order');
        }

        const order = await orderResponse.json();
        orderId = order.id;
        orderCreatedRef.current = true;
      } else {
        // If order was already created, we need to get it from somewhere
        // For now, we'll need to store it
        throw new Error('Order already created. Please refresh and try again.');
      }

      // Step 2: Create payment intent
      const intentResponse = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: calculateTotal(),
          orderId,
          customerEmail: formData.customerEmail,
          customerName: formData.customerName,
        }),
      });

      if (!intentResponse.ok) {
        const error = await intentResponse.json();
        throw new Error(error.error || 'Failed to create payment intent');
      }

      const { clientSecret } = await intentResponse.json();

      // Step 3: Confirm payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: formData.customerName,
              email: formData.customerEmail,
              phone: formData.customerPhone,
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        // Step 4: Confirm payment on our server
        const confirmResponse = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            orderId,
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error('Payment succeeded but failed to update order');
        }

        // Clear cart
        sessionStorage.removeItem('cart');
        onSuccess(orderId);
      } else {
        throw new Error(`Payment status: ${paymentIntent?.status}`);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'An error occurred. Please try again.');
      onError(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Card Information *
        </label>
        <div className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
          <CardElement options={cardElementOptions} />
        </div>
        {paymentError && (
          <p className="text-red-400 text-sm mt-2">{paymentError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing Payment...' : `Pay $${calculateTotal().toFixed(2)}`}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    pickupTime: '',
    specialInstructions: '',
  });
  const [pickupOption, setPickupOption] = useState<'asap' | 'later'>('asap');
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    // Load cart from sessionStorage
    const storedCart = sessionStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    } else {
      // No cart, redirect to order page
      router.push('/order');
    }
  }, [router]);

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCustomerInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate customer info
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) {
      alert('Please fill in all required fields');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentSuccess = (orderId: string) => {
    router.push(`/order/confirmation/${orderId}`);
  };

  const handlePaymentError = (error: string) => {
    // Error is already shown in PaymentForm component
    console.error('Payment error:', error);
  };

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Your cart is empty</p>
          <Link
            href="/order"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition"
          >
            Start Ordering
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-16 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={index} className="border-b border-gray-800 pb-3 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.modifiers.join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-[var(--color-accent)] ml-2">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax</span>
                <span className="text-white">${calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-800 pt-2 mt-2">
                <span className="text-white">Total</span>
                <span className="text-[var(--color-accent)]">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {showPayment ? 'Payment Information' : 'Customer Information'}
            </h2>
            
            {!showPayment ? (
              <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                    placeholder="(303) 555-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pickup Time
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="radio"
                          name="pickupOption"
                          value="asap"
                          checked={pickupOption === 'asap'}
                          onChange={() => {
                            setPickupOption('asap');
                            setFormData({ ...formData, pickupTime: '' });
                          }}
                          className="w-4 h-4 text-[var(--color-accent)] bg-gray-800 border-gray-700 focus:ring-[var(--color-accent)]"
                        />
                        <span className="text-sm text-gray-300">ASAP</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="radio"
                          name="pickupOption"
                          value="later"
                          checked={pickupOption === 'later'}
                          onChange={() => setPickupOption('later')}
                          className="w-4 h-4 text-[var(--color-accent)] bg-gray-800 border-gray-700 focus:ring-[var(--color-accent)]"
                        />
                        <span className="text-sm text-gray-300">Schedule for later</span>
                      </label>
                    </div>
                    {pickupOption === 'later' && (
                      <input
                        type="datetime-local"
                        value={formData.pickupTime}
                        onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                        required={pickupOption === 'later'}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                    rows={3}
                    placeholder="Any special requests or notes for your order?"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Link
                    href="/order"
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition text-center"
                  >
                    Back to Menu
                  </Link>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition"
                  >
                    Continue to Payment
                  </button>
                </div>
              </form>
            ) : (
              stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    mode: 'payment',
                    amount: Math.round(calculateTotal() * 100),
                    currency: 'usd',
                  }}
                >
                  <PaymentForm
                    cart={cart}
                    formData={formData}
                    pickupOption={pickupOption}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                  <button
                    onClick={() => setShowPayment(false)}
                    className="w-full mt-4 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition text-center"
                  >
                    Back to Customer Info
                  </button>
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Stripe is not configured. Please contact support.</p>
                  <button
                    onClick={() => setShowPayment(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                  >
                    Go Back
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

