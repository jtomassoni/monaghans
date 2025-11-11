'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  priceNotes: string | null;
  modifiers: string | null;
}

interface MenuSection {
  id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

interface DailySpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  timeWindow: string | null;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
  specialInstructions?: string;
}

export default function OrderingInterface({
  breakfastSections,
  dinnerSections,
  dailySpecials = [],
}: {
  breakfastSections: MenuSection[];
  dinnerSections: MenuSection[];
  dailySpecials?: DailySpecial[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'breakfast' | 'dinner'>(
    breakfastSections.length > 0 ? 'breakfast' : 'dinner'
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');

  const sections = activeTab === 'breakfast' ? breakfastSections : dinnerSections;
  const todaySpecial = dailySpecials.length > 0 ? dailySpecials[0] : null;

  // Parse price string to number (handles "$14", "$8-12", etc.)
  const parsePrice = (priceStr: string | null): number => {
    if (!priceStr) return 0;
    // Extract first number from price string
    const match = priceStr.match(/\$?(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const price = parsePrice(selectedItem.price);
    const cartItem: CartItem = {
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price,
      quantity: itemQuantity,
      modifiers: selectedModifiers,
      specialInstructions: itemNotes || undefined,
    };

    setCart([...cart, cartItem]);
    setShowItemModal(false);
    setSelectedItem(null);
    setSelectedModifiers([]);
    setItemQuantity(1);
    setItemNotes('');
    setShowCart(true);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
    setCart(newCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    // Assuming 8% tax rate (adjust as needed)
    return calculateSubtotal() * 0.08;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const openItemModal = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedModifiers([]);
    setItemQuantity(1);
    setItemNotes('');
    
    // Parse modifiers if available
    if (item.modifiers) {
      try {
        const modifiers = JSON.parse(item.modifiers);
        if (Array.isArray(modifiers) && modifiers.length > 0) {
          // Pre-select first option if it's a single choice
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    setShowItemModal(true);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    // Store cart in sessionStorage for checkout page
    sessionStorage.setItem('cart', JSON.stringify(cart));
    router.push('/order/checkout');
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:items-start">
      {/* Main Menu Area */}
      <div className="flex justify-center">
        <div className="w-full max-w-3xl space-y-4">
          {/* Daily Specials Section */}
          {todaySpecial && (
            <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/60 backdrop-blur-sm border-2 border-yellow-600 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Today&apos;s Special</span>
                {todaySpecial.timeWindow && (
                  <span className="text-yellow-300 text-xs">({todaySpecial.timeWindow})</span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{todaySpecial.title}</h2>
              {todaySpecial.description && (
                <p className="text-gray-200 text-sm mb-2">{todaySpecial.description}</p>
              )}
              {todaySpecial.priceNotes && (
                <p className="text-yellow-400 font-semibold text-sm">{todaySpecial.priceNotes}</p>
              )}
            </div>
          )}

          {/* Tab Buttons */}
          {breakfastSections.length > 0 && dinnerSections.length > 0 && (
            <div className="flex gap-3 justify-center border-b border-gray-800 pb-2">
              <button
                onClick={() => setActiveTab('breakfast')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'breakfast'
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Breakfast Menu
              </button>
              <button
                onClick={() => setActiveTab('dinner')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'dinner'
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Dinner Menu
              </button>
            </div>
          )}

          {/* Menu Sections */}
          {sections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-xl">Menu coming soon!</p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold mb-1 text-[var(--color-gold)]">
                    {section.name}
                  </h2>
                  {section.description && (
                    <p className="text-gray-400 italic text-xs mb-2">{section.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-3xl mx-auto">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openItemModal(item)}
                      className="text-left bg-gray-900/50 backdrop-blur-sm border border-gray-800 p-3 rounded-lg hover:border-[var(--color-accent)] hover:bg-gray-900/70 transition-all"
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="text-sm font-semibold flex-1 min-w-0 break-words">{item.name}</h3>
                        {item.price && (
                          <span className="text-sm font-bold text-[var(--color-accent)] whitespace-nowrap flex-shrink-0">
                            {item.price}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-gray-300 text-xs mb-1">{item.description}</p>
                      )}
                      {item.priceNotes && (
                        <p className="text-gray-400 text-xs mb-1">{item.priceNotes}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className={`${showCart || cart.length > 0 ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-lg p-6 sticky top-20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Your Order</h2>
            {cartItemCount > 0 && (
              <span className="bg-[var(--color-accent)] text-white text-xs font-bold px-2 py-1 rounded-full">
                {cartItemCount}
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="text-gray-400 text-sm">Your cart is empty</p>
          ) : (
            <>
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
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleUpdateQuantity(index, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white text-sm"
                      >
                        -
                      </button>
                      <span className="text-sm text-gray-300 w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(index, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white text-sm"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveFromCart(index)}
                        className="ml-auto text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
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

              <button
                onClick={handleCheckout}
                className="w-full mt-4 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-[var(--color-accent)]/30"
              >
                Proceed to Checkout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">{selectedItem.name}</h3>
            {selectedItem.description && (
              <p className="text-gray-300 text-sm mb-4">{selectedItem.description}</p>
            )}
            {selectedItem.price && (
              <p className="text-lg font-bold text-[var(--color-accent)] mb-4">{selectedItem.price}</p>
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
                  className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white"
                >
                  -
                </button>
                <span className="text-white font-semibold w-8 text-center">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity(itemQuantity + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white"
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
                  setShowItemModal(false);
                  setSelectedItem(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

