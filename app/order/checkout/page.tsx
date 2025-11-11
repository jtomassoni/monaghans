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

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  priceNotes: string | null;
  modifiers: string | null;
  section?: {
    id: string;
    name: string;
  };
}

interface MenuSection {
  id: string;
  name: string;
  items: MenuItem[];
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
        className="w-full px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
  const [processingDemo, setProcessingDemo] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedItemSection, setSelectedItemSection] = useState<MenuSection | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [selectedSide, setSelectedSide] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');

  useEffect(() => {
    // Load cart from sessionStorage
    const storedCart = sessionStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    } else {
      // No cart, redirect to menu page
      router.push('/menu');
    }

    // Fetch menu sections for editing
    const fetchMenuSections = async () => {
      try {
        const response = await fetch('/api/menu-sections?active=true');
        if (response.ok) {
          const sections = await response.json();
          setMenuSections(sections);
        }
      } catch (error) {
        console.error('Failed to fetch menu sections:', error);
      }
    };
    fetchMenuSections();
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

  // Parse price string to number (handles "$14", "$8-12", etc.)
  const parsePrice = (priceStr: string | null): number => {
    if (!priceStr) return 0;
    // Extract first number from price string
    const match = priceStr.match(/\$?(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Determine if an item is an entree (requires side selection)
  const isEntree = (section: MenuSection | null): boolean => {
    if (!section) return false;
    const nonEntreeSections = ['Starters', 'Add-Ons', 'Sauces', 'Salads'];
    return !nonEntreeSections.includes(section.name);
  };

  const sideOptions = ['Fries', 'Tots', 'Sweet Pot Fries'];

  const handleEditItem = (index: number) => {
    const cartItem = cart[index];
    setEditingItemIndex(index);

    // Find the menu item from the sections we already fetched
    let menuItem: MenuItem | null = null;
    let itemSection: MenuSection | null = null;

    for (const section of menuSections) {
      const item = section.items.find((i: MenuItem) => i.id === cartItem.menuItemId);
      if (item) {
        menuItem = item;
        itemSection = section;
        break;
      }
    }

    if (menuItem) {
      setSelectedItem(menuItem);
      setSelectedItemSection(itemSection);
      
      // Parse existing modifiers and side
      const existingModifiers = [...cartItem.modifiers];
      const sideModifier = existingModifiers.find(m => m.startsWith('Side: '));
      if (sideModifier) {
        setSelectedSide(sideModifier.replace('Side: ', ''));
        setSelectedModifiers(existingModifiers.filter(m => !m.startsWith('Side: ')));
      } else {
        setSelectedSide('');
        setSelectedModifiers(existingModifiers);
      }
      
      setItemQuantity(cartItem.quantity);
      setItemNotes(cartItem.specialInstructions || '');
      setShowEditModal(true);
    } else {
      // If item not found in sections, try fetching from API as fallback
      fetch(`/api/menu-items?active=true`)
        .then(response => response.json())
        .then(allItems => {
          const foundItem = allItems.find((item: MenuItem) => item.id === cartItem.menuItemId);
          if (foundItem) {
            const foundSection = menuSections.find(section => 
              section.items.some(i => i.id === foundItem.id)
            ) || null;
            
            setSelectedItem(foundItem);
            setSelectedItemSection(foundSection);
            
            const existingModifiers = [...cartItem.modifiers];
            const sideModifier = existingModifiers.find(m => m.startsWith('Side: '));
            if (sideModifier) {
              setSelectedSide(sideModifier.replace('Side: ', ''));
              setSelectedModifiers(existingModifiers.filter(m => !m.startsWith('Side: ')));
            } else {
              setSelectedSide('');
              setSelectedModifiers(existingModifiers);
            }
            
            setItemQuantity(cartItem.quantity);
            setItemNotes(cartItem.specialInstructions || '');
            setShowEditModal(true);
          }
        })
        .catch(error => {
          console.error('Failed to fetch menu item:', error);
        });
    }
  };

  const handleSaveEdit = () => {
    if (!selectedItem || editingItemIndex === null) return;

    // Validate side selection for entrees
    if (isEntree(selectedItemSection) && !selectedSide) {
      alert('Please select a side option');
      return;
    }

    const price = parsePrice(selectedItem.price);
    // Include side in modifiers if it's an entree
    const allModifiers = isEntree(selectedItemSection) && selectedSide
      ? [...selectedModifiers, `Side: ${selectedSide}`]
      : selectedModifiers;

    const updatedCart = [...cart];
    updatedCart[editingItemIndex] = {
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price,
      quantity: itemQuantity,
      modifiers: allModifiers,
      specialInstructions: itemNotes || undefined,
    };

    setCart(updatedCart);
    sessionStorage.setItem('cart', JSON.stringify(updatedCart));
    setShowEditModal(false);
    setEditingItemIndex(null);
    setSelectedItem(null);
    setSelectedItemSection(null);
    setSelectedModifiers([]);
    setSelectedSide('');
    setItemQuantity(1);
    setItemNotes('');
  };

  const handleRemoveItem = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    sessionStorage.setItem('cart', JSON.stringify(newCart));
  };

  const handleDemoPayment = async () => {
    setProcessingDemo(true);
    try {
      const response = await fetch('/api/payments/demo', {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process demo payment');
      }

      const { order } = await response.json();
      
      // Clear cart
      sessionStorage.removeItem('cart');
      
      // Redirect to confirmation
      router.push(`/order/confirmation/${order.id}`);
    } catch (error: any) {
      console.error('Demo payment error:', error);
      alert(error.message || 'Failed to process demo payment. Please try again.');
    } finally {
      setProcessingDemo(false);
    }
  };

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Your cart is empty</p>
          <Link
            href="/menu"
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
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditItem(index)}
                        className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
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
                    href="/menu"
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition text-center cursor-pointer"
                  >
                    Add More Items
                  </Link>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition cursor-pointer"
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
                    className="w-full mt-4 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition text-center cursor-pointer"
                  >
                    Back to Customer Info
                  </button>
                </Elements>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-4">
                    <p className="text-yellow-300 text-sm font-semibold mb-2">Demo Mode</p>
                    <p className="text-gray-400 text-xs">
                      Stripe is not configured. Use the demo payment option below to complete your order for demonstration purposes.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleDemoPayment}
                    disabled={processingDemo}
                    className="w-full px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {processingDemo ? 'Processing Demo Payment...' : `Process Demo Payment - $${calculateTotal().toFixed(2)}`}
                  </button>
                  
                  <button
                    onClick={() => setShowPayment(false)}
                    className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition text-center cursor-pointer"
                  >
                    Back to Customer Info
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">Edit {selectedItem.name}</h3>
            {selectedItem.description && (
              <p className="text-gray-300 text-sm mb-4">{selectedItem.description}</p>
            )}
            {selectedItem.price && (
              <p className="text-lg font-bold text-[var(--color-accent)] mb-4">{selectedItem.price}</p>
            )}

            {/* Side Selection (Required for Entrees) */}
            {isEntree(selectedItemSection) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Choose a Side <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {sideOptions.map((side) => (
                    <label key={side} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="side"
                        value={side}
                        checked={selectedSide === side}
                        onChange={(e) => setSelectedSide(e.target.value)}
                        className="w-4 h-4 text-[var(--color-accent)] bg-gray-800 border-gray-700 focus:ring-[var(--color-accent)]"
                        required
                      />
                      <span className="text-sm text-gray-300">{side}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Modifiers */}
            {selectedItem.modifiers && (() => {
              try {
                const modifiers = JSON.parse(selectedItem.modifiers);
                if (Array.isArray(modifiers) && modifiers.length > 0) {
                  return (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
                      <div className="space-y-2">
                        {modifiers.map((modifier: string, idx: number) => (
                          <label key={idx} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedModifiers.includes(modifier)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModifiers([...selectedModifiers, modifier]);
                                } else {
                                  setSelectedModifiers(selectedModifiers.filter(m => m !== modifier));
                                }
                              }}
                              className="w-4 h-4 text-[var(--color-accent)] bg-gray-800 border-gray-700 rounded focus:ring-[var(--color-accent)]"
                            />
                            <span className="text-sm text-gray-300">{modifier}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch {
                // Invalid JSON, ignore
              }
              return null;
            })()}

            {/* Quantity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white cursor-pointer"
                >
                  -
                </button>
                <span className="text-white font-semibold w-8 text-center">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity(itemQuantity + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Special Instructions</label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Any special requests?"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItemIndex(null);
                  setSelectedItem(null);
                  setSelectedItemSection(null);
                  setSelectedSide('');
                  setSelectedModifiers([]);
                  setItemQuantity(1);
                  setItemNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isEntree(selectedItemSection) && !selectedSide}
                className="flex-1 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

