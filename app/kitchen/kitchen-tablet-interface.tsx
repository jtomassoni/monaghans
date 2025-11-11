'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUtensils, 
  FaCheckCircle, 
  FaClock, 
  FaSignOutAlt, 
  FaBell,
  FaExclamationTriangle,
  FaUser
} from 'react-icons/fa';

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
  const [username, setUsername] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get username from localStorage
  useEffect(() => {
    const storedUsername = localStorage.getItem('kitchen_username') || 'Kitchen Staff';
    setUsername(storedUsername);
  }, []);

  // Initialize audio for alerts
  useEffect(() => {
    // Create audio context for beep sound
    if (typeof window !== 'undefined' && soundEnabled) {
      audioRef.current = new Audio();
    }
  }, [soundEnabled]);

  // Play alert sound for new orders
  const playAlertSound = () => {
    if (!soundEnabled || !audioRef.current) return;
    
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Higher pitch for attention
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing alert sound:', error);
    }
  };

  // Fetch orders - only show orders in BOH workflow (confirmed and beyond, but not completed)
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/kitchen/orders?status=all', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_KITCHEN_API_TOKEN || 'kitchen-token-dev'}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Only show orders that are confirmed or in BOH workflow
        // Exclude: pending (FOH hasn't confirmed), completed (FOH handles), cancelled
        const validStatuses = ['confirmed', 'acknowledged', 'preparing', 'ready'];
        const bohOrders = data.filter((o: Order) => {
          const normalizedStatus = (o.status || '').toLowerCase().trim();
          return validStatuses.includes(normalizedStatus);
        });
        
        // Check for new orders and play sound
        const newOrderCount = bohOrders.length;
        const newConfirmedCount = bohOrders.filter((o: Order) => 
          (o.status || '').toLowerCase().trim() === 'confirmed'
        ).length;
        
        // Play sound if new confirmed orders arrive
        if (previousOrderCount > 0 && newConfirmedCount > 0) {
          const previousConfirmed = orders.filter((o: Order) => 
            (o.status || '').toLowerCase().trim() === 'confirmed'
          ).length;
          if (newConfirmedCount > previousConfirmed) {
            playAlertSound();
          }
        }
        setPreviousOrderCount(newOrderCount);
        
        setOrders(bohOrders);
      } else {
        console.error('Failed to fetch orders:', response.status, response.statusText);
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
    const interval = setInterval(fetchOrders, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_KITCHEN_API_TOKEN || 'kitchen-token-dev'}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
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
    const doubleTapDelay = 500;

    if (
      lastTap &&
      lastTap.orderId === order.id &&
      now - lastTap.time < doubleTapDelay
    ) {
      // BOH workflow: confirmed → acknowledged → preparing → ready
      // FOH handles: ready → completed
      const normalizedStatus = (order.status || '').toLowerCase().trim();
      const nextStatus =
        normalizedStatus === 'confirmed'
          ? 'acknowledged'
          : normalizedStatus === 'acknowledged'
          ? 'preparing'
          : normalizedStatus === 'preparing'
          ? 'ready'
          : null; // Ready orders are completed by FOH, not kitchen

      if (nextStatus) {
        handleStatusUpdate(order.id, nextStatus);
      }
      setLastTap(null);
    } else {
      setLastTap({ orderId: order.id, time: now });
      setTimeout(() => setLastTap(null), doubleTapDelay);
    }
  };

  const calculateElapsedTime = (startTime: Date | string | null): { minutes: number; seconds: number; total: number } | null => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return { minutes, seconds, total: diff };
  };

  const handleLogout = () => {
    localStorage.removeItem('kitchen_authenticated');
    localStorage.removeItem('kitchen_username');
    router.push('/kitchen/login');
  };

  // Group orders by status
  const ordersByStatus = {
    confirmed: orders.filter((o) => (o.status || '').toLowerCase().trim() === 'confirmed'),
    acknowledged: orders.filter((o) => (o.status || '').toLowerCase().trim() === 'acknowledged'),
    preparing: orders.filter((o) => (o.status || '').toLowerCase().trim() === 'preparing'),
    ready: orders.filter((o) => (o.status || '').toLowerCase().trim() === 'ready'),
  };

  // Sort by time - oldest first (priority orders)
  const sortByTime = (orders: Order[]) => {
    return [...orders].sort((a, b) => {
      const timeA = a.acknowledgedAt || a.confirmedAt || a.createdAt;
      const timeB = b.acknowledgedAt || b.confirmedAt || b.createdAt;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-4xl font-bold">Loading orders...</div>
      </div>
    );
  }

  const totalActive = orders.length;
  const newOrders = ordersByStatus.confirmed.length;
  const inProgress = ordersByStatus.acknowledged.length + ordersByStatus.preparing.length;
  const readyCount = ordersByStatus.ready.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Header Bar - Fixed */}
      <div className="bg-gray-900 border-b-4 border-gray-800 sticky top-0 z-50 shadow-2xl">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-5xl font-black tracking-tight">KITCHEN DISPLAY</h1>
              <div className="flex items-center gap-2 text-gray-400">
                <FaUser className="text-2xl" />
                <span className="text-xl font-semibold">{username}</span>
              </div>
            </div>
            
            {/* Order Summary Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-6xl font-black text-blue-400">{newOrders}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">New</div>
              </div>
              <div className="text-center">
                <div className="text-6xl font-black text-orange-400">{inProgress}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Active</div>
              </div>
              <div className="text-center">
                <div className="text-6xl font-black text-green-400">{readyCount}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Ready</div>
              </div>
              <div className="text-center border-l-2 border-gray-700 pl-6">
                <div className="text-6xl font-black text-white">{totalActive}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Total</div>
              </div>
              
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-4 py-2 rounded-lg transition ${
                  soundEnabled 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={soundEnabled ? 'Sound alerts ON' : 'Sound alerts OFF'}
              >
                <FaBell className="text-2xl" />
              </button>
              
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-3 transition font-semibold text-lg"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid - Touch Optimized */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* NEW ORDERS - Confirmed */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 border-4 border-blue-400 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-black flex items-center gap-3">
                  <FaCheckCircle className="text-blue-200" />
                  NEW
                </h2>
                <div className="bg-blue-500 text-white text-5xl font-black px-6 py-3 rounded-lg">
                  {ordersByStatus.confirmed.length}
                </div>
              </div>
              <p className="text-blue-200 text-lg font-semibold">Double tap to acknowledge</p>
            </div>
            {sortByTime(ordersByStatus.confirmed).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                calculateElapsedTime={calculateElapsedTime}
                onTap={handleOrderTap}
                priority="high"
              />
            ))}
            {ordersByStatus.confirmed.length === 0 && (
              <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-2xl">No new orders</p>
              </div>
            )}
          </div>

          {/* ACKNOWLEDGED */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 border-4 border-cyan-400 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-black flex items-center gap-3">
                  <FaCheckCircle className="text-cyan-200" />
                  ACKNOWLEDGED
                </h2>
                <div className="bg-cyan-500 text-white text-5xl font-black px-6 py-3 rounded-lg">
                  {ordersByStatus.acknowledged.length}
                </div>
              </div>
              <p className="text-cyan-200 text-lg font-semibold">Double tap to start cooking</p>
            </div>
            {sortByTime(ordersByStatus.acknowledged).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                calculateElapsedTime={calculateElapsedTime}
                onTap={handleOrderTap}
              />
            ))}
            {ordersByStatus.acknowledged.length === 0 && (
              <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-2xl">No acknowledged orders</p>
              </div>
            )}
          </div>

          {/* COOKING - Preparing */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-orange-600 to-orange-800 border-4 border-orange-400 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-black flex items-center gap-3">
                  <FaUtensils className="text-orange-200" />
                  COOKING
                </h2>
                <div className="bg-orange-500 text-white text-5xl font-black px-6 py-3 rounded-lg">
                  {ordersByStatus.preparing.length}
                </div>
              </div>
              <p className="text-orange-200 text-lg font-semibold">Double tap when ready</p>
            </div>
            {sortByTime(ordersByStatus.preparing).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                calculateElapsedTime={calculateElapsedTime}
                onTap={handleOrderTap}
              />
            ))}
            {ordersByStatus.preparing.length === 0 && (
              <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-2xl">No orders cooking</p>
              </div>
            )}
          </div>

          {/* READY */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-green-600 to-green-800 border-4 border-green-400 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-black flex items-center gap-3">
                  <FaCheckCircle className="text-green-200" />
                  READY
                </h2>
                <div className="bg-green-500 text-white text-5xl font-black px-6 py-3 rounded-lg">
                  {ordersByStatus.ready.length}
                </div>
              </div>
              <p className="text-green-200 text-lg font-semibold">Double tap to complete</p>
            </div>
            {sortByTime(ordersByStatus.ready).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                calculateElapsedTime={calculateElapsedTime}
                onTap={handleOrderTap}
              />
            ))}
            {ordersByStatus.ready.length === 0 && (
              <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
                <p className="text-gray-500 text-2xl">No orders ready</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  calculateElapsedTime,
  onTap,
  priority = false,
}: {
  order: Order;
  calculateElapsedTime: (time: Date | string | null) => { minutes: number; seconds: number; total: number } | null;
  onTap: (order: Order) => void;
  priority?: boolean | string;
}) {
  const normalizedStatus = (order.status || '').toLowerCase().trim();
  const timeData =
    normalizedStatus === 'preparing' && order.preparingAt
      ? calculateElapsedTime(order.preparingAt)
      : normalizedStatus === 'ready' && order.readyAt
      ? calculateElapsedTime(order.readyAt)
      : normalizedStatus === 'acknowledged' && order.acknowledgedAt
      ? calculateElapsedTime(order.acknowledgedAt)
      : normalizedStatus === 'confirmed' && order.confirmedAt
      ? calculateElapsedTime(order.confirmedAt)
      : calculateElapsedTime(order.createdAt);

  const getStatusColor = () => {
    switch (normalizedStatus) {
      case 'confirmed':
        return 'border-blue-500 bg-gradient-to-br from-blue-900/50 to-blue-800/30';
      case 'acknowledged':
        return 'border-cyan-500 bg-gradient-to-br from-cyan-900/50 to-cyan-800/30';
      case 'preparing':
        return 'border-orange-500 bg-gradient-to-br from-orange-900/50 to-orange-800/30';
      case 'ready':
        return 'border-green-500 bg-gradient-to-br from-green-900/50 to-green-800/30';
      default:
        return 'border-gray-500 bg-gray-900/50';
    }
  };

  const isUrgent = timeData && timeData.total > 900; // 15 minutes
  const isWarning = timeData && timeData.total > 600; // 10 minutes

  return (
    <div
      onClick={() => onTap(order)}
      className={`border-4 rounded-xl p-6 bg-gray-900 cursor-pointer active:scale-[0.98] transition-all touch-manipulation shadow-xl hover:shadow-2xl ${getStatusColor()} ${
        priority ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
      } ${isUrgent ? 'animate-pulse' : ''}`}
    >
      {/* Order Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-5xl font-black">{order.orderNumber}</h3>
            {isUrgent && (
              <FaExclamationTriangle className="text-red-500 text-3xl animate-pulse" />
            )}
          </div>
          <p className="text-2xl text-gray-300 font-semibold mb-1">{order.customerName}</p>
          {order.pickupTime ? (
            <p className="text-lg text-gray-400">
              Pickup: {new Date(order.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : (
            <p className="text-lg text-yellow-400 font-bold">ASAP</p>
          )}
        </div>
        {timeData && (
          <div className="text-right ml-4">
            <div className={`text-5xl font-black ${
              isUrgent ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-white'
            }`}>
              {timeData.minutes}:{timeData.seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wide">elapsed</div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="space-y-3 mb-4">
        {order.items.map((item) => (
          <div key={item.id} className="bg-gray-950/70 rounded-lg p-4 border border-gray-800">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-black text-2xl mb-1">
                  <span className="text-3xl text-blue-400">{item.quantity}x</span> {item.name}
                </div>
                {item.modifiers && (() => {
                  try {
                    const modifiers = JSON.parse(item.modifiers);
                    if (Array.isArray(modifiers) && modifiers.length > 0) {
                      return (
                        <div className="text-lg text-gray-400 mt-2">
                          {modifiers.join(' • ')}
                        </div>
                      );
                    }
                  } catch {}
                  return null;
                })()}
                {item.specialInstructions && (
                  <div className="text-lg text-yellow-400 italic mt-2 font-semibold">
                    ⚠ Note: {item.specialInstructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <div className="mb-4 p-4 bg-yellow-600/30 border-2 border-yellow-500 rounded-lg">
          <p className="text-lg font-black text-yellow-200">
            ORDER NOTE: {order.specialInstructions}
          </p>
        </div>
      )}

      {/* Status Indicator */}
      <div className="text-center pt-4 border-t-2 border-gray-800">
        <p className="text-lg text-gray-400 font-semibold">
          {normalizedStatus === 'confirmed'
            ? '👆 Double tap to acknowledge'
            : normalizedStatus === 'acknowledged'
            ? '👆 Double tap to start cooking'
            : normalizedStatus === 'preparing'
            ? '👆 Double tap when ready'
            : '✅ Ready for pickup (FOH will complete)'}
        </p>
      </div>
    </div>
  );
}
