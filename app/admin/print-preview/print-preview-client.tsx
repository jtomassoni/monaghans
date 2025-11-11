'use client';

import { useState, useEffect } from 'react';

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
  items: OrderItem[];
}

export default function PrintPreviewClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printData, setPrintData] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=all');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.filter((o: Order) => o.status !== 'completed' && o.status !== 'cancelled'));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePrintPreview = async (order: Order) => {
    try {
      const response = await fetch('/api/printers/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setPrintData(data.printData);
        setSelectedOrder(order);
      }
    } catch (error) {
      console.error('Error generating print preview:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Print Job Preview & QA</h1>
        <p className="text-gray-400 mb-6">
          Select an order to preview what would be printed. This is for QA purposes - no actual printing will occur.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => generatePrintPreview(order)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    selectedOrder?.id === order.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20'
                      : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{order.orderNumber}</div>
                      <div className="text-sm text-gray-400">{order.customerName}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      order.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      order.status === 'preparing' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Print Preview */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Print Preview</h2>
            {selectedOrder ? (
              <div className="bg-white text-black p-6 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {printData || 'Generating preview...'}
              </div>
            ) : (
              <div className="bg-gray-700 rounded-lg p-12 text-center text-gray-400">
                Select an order to preview the print job
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

