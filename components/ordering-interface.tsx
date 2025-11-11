'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';

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
  const [selectedItemSection, setSelectedItemSection] = useState<MenuSection | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [selectedSide, setSelectedSide] = useState<string>('');
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

  // Determine if an item is an entree (requires side selection)
  const isEntree = (section: MenuSection | null): boolean => {
    if (!section) return false;
    const nonEntreeSections = ['Starters', 'Add-Ons', 'Sauces', 'Salads'];
    return !nonEntreeSections.includes(section.name);
  };

  const sideOptions = ['Fries', 'Tots', 'Sweet Pot Fries'];

  const handleAddToCart = () => {
    if (!selectedItem) return;

    // Validate side selection for entrees
    if (isEntree(selectedItemSection) && !selectedSide) {
      showToast('Please select a side option', 'error', 'All entrees require a side selection.');
      return;
    }

    const price = parsePrice(selectedItem.price);
    // Include side in modifiers if it's an entree
    const allModifiers = isEntree(selectedItemSection) && selectedSide
      ? [...selectedModifiers, `Side: ${selectedSide}`]
      : selectedModifiers;

    const cartItem: CartItem = {
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price,
      quantity: itemQuantity,
      modifiers: allModifiers,
      specialInstructions: itemNotes || undefined,
    };

    setCart([...cart, cartItem]);
    setShowItemModal(false);
    setSelectedItem(null);
    setSelectedItemSection(null);
    setSelectedModifiers([]);
    setSelectedSide('');
    setItemQuantity(1);
    setItemNotes('');
    // Don't auto-open cart, let user click the floating button
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    if (newCart.length === 0) {
      setShowCart(false);
    }
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
    // Find the section this item belongs to
    const itemSection = sections.find(section => 
      section.items.some(i => i.id === item.id)
    ) || null;

    setSelectedItem(item);
    setSelectedItemSection(itemSection);
    setSelectedModifiers([]);
    setSelectedSide('');
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
    <div className="w-full">
      {/* Main Menu Area */}
      <div className="flex justify-center">
        <div className="w-full max-w-4xl space-y-4">
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
                className={`px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'breakfast'
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Breakfast Menu
              </button>
              <button
                onClick={() => setActiveTab('dinner')}
                className={`px-4 py-2 text-sm font-semibold transition cursor-pointer ${
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
                      className="text-left bg-gray-900/50 backdrop-blur-sm border border-gray-800 p-3 rounded-lg hover:border-[var(--color-accent)] hover:bg-gray-900/70 transition-all cursor-pointer"
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

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold px-6 py-4 rounded-full shadow-lg shadow-[var(--color-accent)]/50 flex items-center gap-3 transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>View Cart</span>
          <span className="bg-white text-[var(--color-accent)] text-xs font-bold px-2 py-1 rounded-full">
            {cartItemCount}
          </span>
        </button>
      )}

      {/* Cart Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          showCart ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowCart(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        
        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-out ${
            showCart ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Your Order</h2>
              <div className="flex items-center gap-3">
                {cartItemCount > 0 && (
                  <span className="bg-[var(--color-accent)] text-white text-xs font-bold px-2 py-1 rounded-full">
                    {cartItemCount}
                  </span>
                )}
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Cart Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-400 text-sm">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="border-b border-gray-800 pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
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
                          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white text-sm cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-sm text-gray-300 w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(index, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white text-sm cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(index)}
                          className="ml-auto text-red-400 hover:text-red-300 text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Totals and Checkout */}
            {cart.length > 0 && (
              <div className="border-t border-gray-800 p-6 bg-gray-900/95">
                <div className="space-y-2 mb-4">
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
                  className="w-full px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-[var(--color-accent)]/30 cursor-pointer"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">{selectedItem.name}</h3>
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
                  setShowItemModal(false);
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
                onClick={handleAddToCart}
                disabled={isEntree(selectedItemSection) && !selectedSide}
                className="flex-1 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition cursor-pointer"
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

