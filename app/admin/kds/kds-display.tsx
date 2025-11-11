'use client';

import { useState, useEffect } from 'react';
import { FaClock, FaCheckCircle, FaUtensils, FaTimes, FaEdit } from 'react-icons/fa';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string | null;
  specialInstructions: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  pickupTime: Date | string | null;
  specialInstructions: string | null;
  createdAt: Date | string;
  confirmedAt: Date | string | null;
  acknowledgedAt: Date | string | null;
  preparingAt: Date | string | null;
  readyAt: Date | string | null;
  items: OrderItem[];
}

export default function KDSDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  // Fetch orders - only show orders in BOH workflow (confirmed and beyond, but not completed)
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=all');
      if (response.ok) {
        const data = await response.json();
        // Only show orders that are confirmed or in BOH workflow
        // Exclude: pending (FOH hasn't confirmed), completed (FOH handles), cancelled
        const validStatuses = ['confirmed', 'acknowledged', 'preparing', 'ready'];
        const bohOrders = data.filter((o: Order) => {
          const normalizedStatus = (o.status || '').toLowerCase().trim();
          return validStatuses.includes(normalizedStatus);
        });
        console.log('KDS: Total orders fetched:', data.length);
        console.log('KDS: BOH orders filtered:', bohOrders.length);
        console.log('KDS: Order statuses:', data.map((o: Order) => o.status));
        setOrders(bohOrders);
      } else {
        console.error('KDS: Failed to fetch orders:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('KDS: Error response:', errorText);
      }
    } catch (error) {
      console.error('KDS: Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders(); // Refresh immediately
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleItemUpdate = async (itemId: string, updates: { quantity?: number; modifiers?: string[]; specialInstructions?: string }) => {
    try {
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchOrders(); // Refresh immediately
      } else {
        const error = await response.json();
        console.error('Error updating item:', error);
        alert(`Failed to update item: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item. Please try again.');
    }
  };

  const calculateElapsedTime = (startTime: Date | string | null) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000); // seconds
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'confirmed':
        return 'border-blue-500 bg-blue-500/10';
      case 'acknowledged':
        return 'border-cyan-500 bg-cyan-500/10';
      case 'preparing':
        return 'border-orange-500 bg-orange-500/10';
      case 'ready':
        return 'border-green-500 bg-green-500/10';
      case 'completed':
        return 'border-gray-500 bg-gray-500/10 opacity-50';
      case 'cancelled':
        return 'border-red-500 bg-red-500/10 opacity-50';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  // Filter orders: "active" shows in-progress orders (excludes ready), "all" shows everything
  const displayedOrders = filter === 'active' 
    ? orders.filter((o) => (o.status || '').toLowerCase().trim() !== 'ready')
    : orders;

  // Group orders by status - only BOH workflow statuses
  // Flow: confirmed → acknowledged → preparing → ready
  const ordersByStatus = {
    confirmed: displayedOrders.filter((o) => (o.status || '').toLowerCase().trim() === 'confirmed'),
    acknowledged: displayedOrders.filter((o) => (o.status || '').toLowerCase().trim() === 'acknowledged'),
    preparing: displayedOrders.filter((o) => (o.status || '').toLowerCase().trim() === 'preparing'),
    ready: displayedOrders.filter((o) => (o.status || '').toLowerCase().trim() === 'ready'),
  };

  // Sort orders by time - oldest first (priority orders)
  const sortByTime = (orders: Order[]) => {
    return [...orders].sort((a, b) => {
      const timeA = a.acknowledgedAt || a.confirmedAt || a.createdAt;
      const timeB = b.acknowledgedAt || b.confirmedAt || b.createdAt;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--foreground)] text-xl">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center pb-4 border-b border-gray-300 dark:border-gray-800">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">Kitchen Display</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            {displayedOrders.length} {filter === 'active' ? 'active' : 'total'} order{displayedOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('active')}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md cursor-pointer ${
              filter === 'active'
                ? 'bg-[var(--color-accent)] text-white shadow-[var(--color-accent)]/30'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md cursor-pointer ${
              filter === 'all'
                ? 'bg-[var(--color-accent)] text-white shadow-[var(--color-accent)]/30'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Confirmed Orders - Sent to BOH */}
        <div className="space-y-4">
          <div className="bg-blue-500/20 dark:bg-blue-500/20 border-2 border-blue-500 rounded-xl p-4 shadow-lg">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <FaCheckCircle className="text-blue-600 dark:text-blue-400" />
              Confirmed ({ordersByStatus.confirmed.length})
            </h2>
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1.5 font-medium">Sent to BOH</p>
          </div>
          {sortByTime(ordersByStatus.confirmed).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
              handleItemUpdate={handleItemUpdate}
            />
          ))}
        </div>

        {/* Acknowledged Orders - BOH Confirmed Receipt */}
        <div className="space-y-4">
          <div className="bg-cyan-500/20 dark:bg-cyan-500/20 border-2 border-cyan-500 rounded-xl p-4 shadow-lg">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <FaCheckCircle className="text-cyan-600 dark:text-cyan-400" />
              Acknowledged ({ordersByStatus.acknowledged.length})
            </h2>
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1.5 font-medium">BOH Received</p>
          </div>
          {sortByTime(ordersByStatus.acknowledged).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
              handleItemUpdate={handleItemUpdate}
            />
          ))}
        </div>

        {/* Preparing Orders */}
        <div className="space-y-4">
          <div className="bg-orange-500/20 dark:bg-orange-500/20 border-2 border-orange-500 rounded-xl p-4 shadow-lg">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <FaUtensils className="text-orange-600 dark:text-orange-400" />
              Preparing ({ordersByStatus.preparing.length})
            </h2>
          </div>
          {sortByTime(ordersByStatus.preparing).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
              handleItemUpdate={handleItemUpdate}
            />
          ))}
        </div>

        {/* Ready Orders */}
        <div className="space-y-4">
          <div className="bg-green-500/20 dark:bg-green-500/20 border-2 border-green-500 rounded-xl p-4 shadow-lg">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <FaCheckCircle className="text-green-600 dark:text-green-400" />
              Ready ({ordersByStatus.ready.length})
            </h2>
          </div>
          {sortByTime(ordersByStatus.ready).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
              handleItemUpdate={handleItemUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  getStatusColor,
  calculateElapsedTime,
  handleStatusUpdate,
  handleItemUpdate,
}: {
  order: Order;
  getStatusColor: (status: string) => string;
  calculateElapsedTime: (time: Date | string | null) => string | null;
  handleStatusUpdate: (orderId: string, status: string) => void;
  handleItemUpdate: (itemId: string, updates: { quantity?: number; modifiers?: string[]; specialInstructions?: string }) => void;
}) {
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editModifiers, setEditModifiers] = useState<string[]>([]);
  const [editSpecialInstructions, setEditSpecialInstructions] = useState('');
  // Calculate elapsed time based on current status
  const elapsedTime = 
    order.status === 'preparing' && order.preparingAt
      ? calculateElapsedTime(order.preparingAt)
      : order.status === 'ready' && order.readyAt
      ? calculateElapsedTime(order.readyAt)
      : order.status === 'acknowledged' && order.acknowledgedAt
      ? calculateElapsedTime(order.acknowledgedAt)
      : order.status === 'confirmed' && order.confirmedAt
      ? calculateElapsedTime(order.confirmedAt)
      : calculateElapsedTime(order.createdAt);

  const nextStatus =
    order.status === 'pending'
      ? 'confirmed'
      : order.status === 'confirmed'
      ? 'acknowledged'
      : order.status === 'acknowledged'
      ? 'preparing'
      : order.status === 'preparing'
      ? 'ready'
      : order.status === 'ready'
      ? 'completed'
      : null;

  const openEditModal = (item: OrderItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditSpecialInstructions(item.specialInstructions || '');
    
    // Parse modifiers
    if (item.modifiers) {
      try {
        const parsed = JSON.parse(item.modifiers);
        setEditModifiers(Array.isArray(parsed) ? parsed : []);
      } catch {
        setEditModifiers([]);
      }
    } else {
      setEditModifiers([]);
    }
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditQuantity(1);
    setEditModifiers([]);
    setEditSpecialInstructions('');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    handleItemUpdate(editingItem.id, {
      quantity: editQuantity,
      modifiers: editModifiers,
      specialInstructions: editSpecialInstructions || undefined,
    });
    
    closeEditModal();
  };

  return (
    <>
      <div
        className={`border-2 rounded-xl p-5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all ${getStatusColor(order.status)}`}
      >
        {/* Order Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-300 dark:border-gray-700/50">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{order.orderNumber}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{order.customerName}</p>
            {order.pickupTime ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Pickup: {new Date(order.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mt-1">ASAP</p>
            )}
          </div>
          {elapsedTime && (
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{elapsedTime}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">elapsed</div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="space-y-3 mb-4">
          {order.items.map((item) => {
            let parsedModifiers: string[] = [];
            if (item.modifiers) {
              try {
                const parsed = JSON.parse(item.modifiers);
                parsedModifiers = Array.isArray(parsed) ? parsed : [];
              } catch {}
            }
            
            return (
              <div key={item.id} className="bg-gray-100 dark:bg-gray-900/70 rounded-lg p-3 border border-gray-300 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600/50 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        {item.quantity}x {item.name}
                      </span>
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-gray-600 dark:text-gray-400 hover:text-[var(--color-accent)] transition-colors p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800/50 cursor-pointer"
                        title="Edit item"
                      >
                        <FaEdit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {parsedModifiers.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1.5 space-y-0.5">
                        {parsedModifiers.map((mod, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-500">•</span>
                            <span>{mod}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-xs text-yellow-700 dark:text-yellow-300 italic mt-2 pt-1.5 border-t border-yellow-500/30 dark:border-yellow-500/20">
                        <span className="font-semibold text-yellow-600 dark:text-yellow-400">Note:</span> {item.specialInstructions}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[var(--color-accent)]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-500/50 rounded-lg">
            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
              <span className="text-yellow-900 dark:text-yellow-400">Order Note:</span> {order.specialInstructions}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-300 dark:border-gray-700/50">
          {nextStatus && (
            <button
              onClick={() => handleStatusUpdate(order.id, nextStatus)}
              className="flex-1 px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-bold rounded-lg transition-all text-sm shadow-md hover:shadow-lg cursor-pointer"
            >
              {nextStatus === 'confirmed'
                ? 'Confirm'
                : nextStatus === 'acknowledged'
                ? 'Acknowledge'
                : nextStatus === 'preparing'
                ? 'Start Prep'
                : nextStatus === 'ready'
                ? 'Mark Ready'
                : 'Complete'}
            </button>
          )}
          {order.status !== 'cancelled' && (
            <button
              onClick={() => handleStatusUpdate(order.id, 'cancelled')}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer"
              title="Cancel Order"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-300 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Item</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{editingItem.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Price: ${editingItem.price.toFixed(2)} each</p>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-white font-bold transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="text-gray-900 dark:text-white font-semibold text-lg w-12 text-center">{editQuantity}</span>
                <button
                  onClick={() => setEditQuantity(editQuantity + 1)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-white font-bold transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Modifiers */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modifiers</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {editModifiers.length > 0 ? (
                  editModifiers.map((modifier, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{modifier}</span>
                      <button
                        onClick={() => setEditModifiers(editModifiers.filter((_, i) => i !== idx))}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-500 italic">No modifiers</p>
                )}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Special Instructions</label>
              <textarea
                value={editSpecialInstructions}
                onChange={(e) => setEditSpecialInstructions(e.target.value)}
                placeholder="Any special requests?"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-colors font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

