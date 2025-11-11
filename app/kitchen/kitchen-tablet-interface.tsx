'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaUtensils, FaCheckCircle, FaClock, FaSignOutAlt } from 'react-icons/fa';

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

export default function KitchenTabletInterface() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastTap, setLastTap] = useState<{ orderId: string; time: number } | null>(null);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      // Use kitchen API endpoint
      const response = await fetch('/api/kitchen/orders?status=all', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_KITCHEN_API_TOKEN || 'kitchen-token-dev'}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Only show orders that are confirmed or beyond (BOH workflow)
        const bohOrders = data.filter((o: Order) => 
          ['confirmed', 'acknowledged', 'preparing', 'ready'].includes(o.status)
        );
        setOrders(bohOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Poll every 3 seconds for real-time updates
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      // Use kitchen API endpoint
      const response = await fetch(`/api/kitchen/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_KITCHEN_API_TOKEN || 'kitchen-token-dev'}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders(); // Refresh immediately
      } else {
        const error = await response.json();
        console.error('Error updating order:', error);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  // Handle double tap to advance status
  const handleOrderTap = (order: Order) => {
    const now = Date.now();
    const doubleTapDelay = 500; // 500ms window for double tap

    if (
      lastTap &&
      lastTap.orderId === order.id &&
      now - lastTap.time < doubleTapDelay
    ) {
      // Double tap detected - advance status
      const nextStatus =
        order.status === 'confirmed'
          ? 'acknowledged'
          : order.status === 'acknowledged'
          ? 'preparing'
          : order.status === 'preparing'
          ? 'ready'
          : order.status === 'ready'
          ? 'completed'
          : null;

      if (nextStatus) {
        handleStatusUpdate(order.id, nextStatus);
      }
      setLastTap(null);
    } else {
      // First tap - set timer
      setLastTap({ orderId: order.id, time: now });
      setTimeout(() => setLastTap(null), doubleTapDelay);
    }
  };

  const calculateElapsedTime = (startTime: Date | string | null) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('kitchen_authenticated');
    localStorage.removeItem('kitchen_username');
    router.push('/kitchen/login');
  };

  // Group orders by status
  const ordersByStatus = {
    confirmed: orders.filter((o) => o.status === 'confirmed'),
    acknowledged: orders.filter((o) => o.status === 'acknowledged'),
    preparing: orders.filter((o) => o.status === 'preparing'),
    ready: orders.filter((o) => o.status === 'ready'),
  };

  // Sort by time - most recent first
  const sortByTime = (orders: Order[]) => {
    return [...orders].sort((a, b) => {
      const timeA = a.acknowledgedAt || a.confirmedAt || a.createdAt;
      const timeB = b.acknowledgedAt || b.confirmedAt || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading orders...</div>
      </div>
    );
  }

  const totalActive = orders.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Kitchen Display</h1>
          <p className="text-gray-400 text-lg mt-1">
            {totalActive} active order{totalActive !== 1 ? 's' : ''}
          </p>
          <p className="text-gray-500 text-sm mt-1">Double tap order to advance status</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>

      {/* Orders Grid - Touch Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Confirmed Orders - New from FOH */}
        <div className="space-y-4">
          <div className="bg-blue-500/20 border-2 border-blue-500 rounded-lg p-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaCheckCircle className="text-blue-400" />
              New ({ordersByStatus.confirmed.length})
            </h2>
            <p className="text-sm text-gray-400 mt-1">Double tap to acknowledge</p>
          </div>
          {sortByTime(ordersByStatus.confirmed).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              calculateElapsedTime={calculateElapsedTime}
              onTap={handleOrderTap}
            />
          ))}
        </div>

        {/* Acknowledged Orders - BOH Received */}
        <div className="space-y-4">
          <div className="bg-cyan-500/20 border-2 border-cyan-500 rounded-lg p-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaCheckCircle className="text-cyan-400" />
              Acknowledged ({ordersByStatus.acknowledged.length})
            </h2>
            <p className="text-sm text-gray-400 mt-1">Double tap to start cooking</p>
          </div>
          {sortByTime(ordersByStatus.acknowledged).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              calculateElapsedTime={calculateElapsedTime}
              onTap={handleOrderTap}
            />
          ))}
        </div>

        {/* Preparing Orders */}
        <div className="space-y-4">
          <div className="bg-orange-500/20 border-2 border-orange-500 rounded-lg p-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaUtensils className="text-orange-400" />
              Cooking ({ordersByStatus.preparing.length})
            </h2>
            <p className="text-sm text-gray-400 mt-1">Double tap when ready</p>
          </div>
          {sortByTime(ordersByStatus.preparing).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              calculateElapsedTime={calculateElapsedTime}
              onTap={handleOrderTap}
            />
          ))}
        </div>

        {/* Ready Orders */}
        <div className="space-y-4">
          <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaCheckCircle className="text-green-400" />
              Ready ({ordersByStatus.ready.length})
            </h2>
            <p className="text-sm text-gray-400 mt-1">Double tap to complete</p>
          </div>
          {sortByTime(ordersByStatus.ready).map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              calculateElapsedTime={calculateElapsedTime}
              onTap={handleOrderTap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  calculateElapsedTime,
  onTap,
}: {
  order: Order;
  calculateElapsedTime: (time: Date | string | null) => string | null;
  onTap: (order: Order) => void;
}) {
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

  const getStatusColor = () => {
    switch (order.status) {
      case 'confirmed':
        return 'border-blue-500 bg-blue-500/10';
      case 'acknowledged':
        return 'border-cyan-500 bg-cyan-500/10';
      case 'preparing':
        return 'border-orange-500 bg-orange-500/10';
      case 'ready':
        return 'border-green-500 bg-green-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div
      onClick={() => onTap(order)}
      className={`border-2 rounded-lg p-5 bg-gray-800 cursor-pointer active:scale-95 transition-transform touch-manipulation ${getStatusColor()}`}
    >
      {/* Order Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-3xl font-bold">{order.orderNumber}</h3>
          <p className="text-lg text-gray-400 mt-1">{order.customerName}</p>
          {order.pickupTime ? (
            <p className="text-sm text-gray-500 mt-1">
              Pickup: {new Date(order.pickupTime).toLocaleTimeString()}
            </p>
          ) : (
            <p className="text-sm text-yellow-400 font-semibold mt-1">ASAP</p>
          )}
        </div>
        {elapsedTime && (
          <div className="text-right">
            <div className="text-2xl font-bold">{elapsedTime}</div>
            <div className="text-sm text-gray-400">elapsed</div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="space-y-3 mb-4">
        {order.items.map((item) => (
          <div key={item.id} className="bg-gray-900/50 rounded p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold text-lg">
                  {item.quantity}x {item.name}
                </div>
                {item.modifiers && (() => {
                  try {
                    const modifiers = JSON.parse(item.modifiers);
                    if (Array.isArray(modifiers) && modifiers.length > 0) {
                      return (
                        <div className="text-sm text-gray-400 mt-1">
                          {modifiers.join(', ')}
                        </div>
                      );
                    }
                  } catch {}
                  return null;
                })()}
                {item.specialInstructions && (
                  <div className="text-sm text-yellow-400 italic mt-1">
                    Note: {item.specialInstructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded">
          <p className="text-sm font-semibold text-yellow-300">
            Order Note: {order.specialInstructions}
          </p>
        </div>
      )}

      {/* Status Indicator */}
      <div className="text-center pt-3 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          {order.status === 'confirmed'
            ? 'Double tap to acknowledge'
            : order.status === 'acknowledged'
            ? 'Double tap to start cooking'
            : order.status === 'preparing'
            ? 'Double tap to mark ready'
            : 'Double tap to complete'}
        </p>
      </div>
    </div>
  );
}

