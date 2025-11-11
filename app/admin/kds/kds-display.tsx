'use client';

import { useState, useEffect } from 'react';
import { FaClock, FaCheckCircle, FaUtensils, FaTimes } from 'react-icons/fa';

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
  preparingAt: Date | string | null;
  readyAt: Date | string | null;
  items: OrderItem[];
}

export default function KDSDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=all');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
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
      case 'confirmed':
        return 'border-yellow-500 bg-yellow-500/10';
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

  const activeOrders = orders.filter(
    (order) => !['completed', 'cancelled'].includes(order.status)
  );
  const displayedOrders = filter === 'active' ? activeOrders : orders;

  // Group orders by status
  const ordersByStatus = {
    pending: displayedOrders.filter((o) => o.status === 'pending'),
    confirmed: displayedOrders.filter((o) => o.status === 'confirmed'),
    preparing: displayedOrders.filter((o) => o.status === 'preparing'),
    ready: displayedOrders.filter((o) => o.status === 'ready'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kitchen Display</h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'active'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'all'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders */}
        <div className="space-y-4">
          <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-lg p-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaClock className="text-yellow-400" />
              Pending ({ordersByStatus.pending.length})
            </h2>
          </div>
          {ordersByStatus.pending.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>

        {/* Confirmed Orders */}
        <div className="space-y-4">
          <div className="bg-blue-500/20 border-2 border-blue-500 rounded-lg p-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaCheckCircle className="text-blue-400" />
              Confirmed ({ordersByStatus.confirmed.length})
            </h2>
          </div>
          {ordersByStatus.confirmed.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>

        {/* Preparing Orders */}
        <div className="space-y-4">
          <div className="bg-orange-500/20 border-2 border-orange-500 rounded-lg p-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaUtensils className="text-orange-400" />
              Preparing ({ordersByStatus.preparing.length})
            </h2>
          </div>
          {ordersByStatus.preparing.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>

        {/* Ready Orders */}
        <div className="space-y-4">
          <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaCheckCircle className="text-green-400" />
              Ready ({ordersByStatus.ready.length})
            </h2>
          </div>
          {ordersByStatus.ready.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusColor={getStatusColor}
              calculateElapsedTime={calculateElapsedTime}
              handleStatusUpdate={handleStatusUpdate}
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
}: {
  order: Order;
  getStatusColor: (status: string) => string;
  calculateElapsedTime: (time: Date | string | null) => string | null;
  handleStatusUpdate: (orderId: string, status: string) => void;
}) {
  const elapsedTime = order.preparingAt
    ? calculateElapsedTime(order.preparingAt)
    : order.confirmedAt
    ? calculateElapsedTime(order.confirmedAt)
    : calculateElapsedTime(order.createdAt);

  const nextStatus =
    order.status === 'pending'
      ? 'confirmed'
      : order.status === 'confirmed'
      ? 'preparing'
      : order.status === 'preparing'
      ? 'ready'
      : order.status === 'ready'
      ? 'completed'
      : null;

  return (
    <div
      className={`border-2 rounded-lg p-4 bg-gray-800 ${getStatusColor(order.status)}`}
    >
      {/* Order Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-2xl font-bold">{order.orderNumber}</h3>
          <p className="text-sm text-gray-400 mt-1">{order.customerName}</p>
          {order.pickupTime ? (
            <p className="text-xs text-gray-500">
              Pickup: {new Date(order.pickupTime).toLocaleTimeString()}
            </p>
          ) : (
            <p className="text-xs text-yellow-400 font-semibold">ASAP</p>
          )}
        </div>
        {elapsedTime && (
          <div className="text-right">
            <div className="text-lg font-bold">{elapsedTime}</div>
            <div className="text-xs text-gray-400">elapsed</div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="space-y-2 mb-3">
        {order.items.map((item) => (
          <div key={item.id} className="bg-gray-900/50 rounded p-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold">
                  {item.quantity}x {item.name}
                </div>
                {item.modifiers && (() => {
                  try {
                    const modifiers = JSON.parse(item.modifiers);
                    if (Array.isArray(modifiers) && modifiers.length > 0) {
                      return (
                        <div className="text-xs text-gray-400 mt-1">
                          {modifiers.join(', ')}
                        </div>
                      );
                    }
                  } catch {}
                  return null;
                })()}
                {item.specialInstructions && (
                  <div className="text-xs text-yellow-400 italic mt-1">
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
        <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded">
          <p className="text-xs font-semibold text-yellow-300">
            Order Note: {order.specialInstructions}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {nextStatus && (
          <button
            onClick={() => handleStatusUpdate(order.id, nextStatus)}
            className="flex-1 px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-bold rounded-lg transition text-sm"
          >
            {nextStatus === 'confirmed'
              ? 'Confirm'
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
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
            title="Cancel Order"
          >
            <FaTimes />
          </button>
        )}
      </div>
    </div>
  );
}

