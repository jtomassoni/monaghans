'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaSearch,
  FaFilter,
  FaStickyNote,
  FaExclamationCircle,
  FaPrint,
} from 'react-icons/fa';
import { getOrderStatusOptions } from '@/lib/order-helpers';
import Modal from '@/components/modal';

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
  customerEmail: string;
  customerPhone: string;
  pickupTime: Date | string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: string;
  specialInstructions: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items: OrderItem[];
}

interface OrdersListProps {
  initialOrders: Order[];
}

export default function OrdersList({ initialOrders }: OrdersListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [printPreviewOrder, setPrintPreviewOrder] = useState<Order | null>(null);
  const [printPreviewData, setPrintPreviewData] = useState<string>('');
  const [loadingPrintPreview, setLoadingPrintPreview] = useState(false);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
        router.refresh();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('An error occurred');
    }
  };

  const handlePrintPreview = async (order: Order) => {
    setLoadingPrintPreview(true);
    setPrintPreviewOrder(order);
    setPrintPreviewData('');

    try {
      const response = await fetch('/api/printers/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setPrintPreviewData(data.printData);
      } else {
        alert('Failed to generate print preview');
        setPrintPreviewOrder(null);
      }
    } catch (error) {
      console.error('Error generating print preview:', error);
      alert('An error occurred while generating print preview');
      setPrintPreviewOrder(null);
    } finally {
      setLoadingPrintPreview(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'acknowledged':
        return 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'preparing':
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'ready':
        return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30';
      case 'completed':
        return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-500/50 focus:border-yellow-500 dark:border-yellow-500/50 dark:focus:border-yellow-500';
      case 'confirmed':
        return 'border-blue-500/50 focus:border-blue-500 dark:border-blue-500/50 dark:focus:border-blue-500';
      case 'acknowledged':
        return 'border-cyan-500/50 focus:border-cyan-500 dark:border-cyan-500/50 dark:focus:border-cyan-500';
      case 'preparing':
        return 'border-orange-500/50 focus:border-orange-500 dark:border-orange-500/50 dark:focus:border-orange-500';
      case 'ready':
        return 'border-green-500/50 focus:border-green-500 dark:border-green-500/50 dark:focus:border-green-500';
      case 'completed':
        return 'border-gray-500/50 focus:border-gray-500 dark:border-gray-500/50 dark:focus:border-gray-500';
      case 'cancelled':
        return 'border-red-500/50 focus:border-red-500 dark:border-red-500/50 dark:focus:border-red-500';
      default:
        return 'border-gray-500/50 focus:border-gray-500 dark:border-gray-500/50 dark:focus:border-gray-500';
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const orderStatusOptions = getOrderStatusOptions();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by order number, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Header Section */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {order.orderNumber}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePrintPreview(order)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-semibold transition-all shadow-sm hover:shadow-md"
                        title="View Print Preview"
                      >
                        <FaPrint className="w-4 h-4" />
                        <span className="hidden sm:inline">Print Preview</span>
                      </button>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide whitespace-nowrap">
                        Update Status
                      </label>
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          className={`appearance-none px-4 py-2.5 pr-10 text-sm bg-white dark:bg-gray-700 border-2 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-1 font-semibold min-w-[180px] cursor-pointer transition-all shadow-sm hover:shadow-md ${getStatusBorderColor(order.status)}`}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '1em 1em',
                          }}
                        >
                          {/* Chronological order: pending → confirmed → acknowledged → preparing → ready → completed → cancelled */}
                          {orderStatusOptions
                            .sort((a, b) => {
                              const order = ['pending', 'confirmed', 'acknowledged', 'preparing', 'ready', 'completed', 'cancelled'];
                              return order.indexOf(a.value) - order.indexOf(b.value);
                            })
                            .map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Customer Information */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Customer
                        </h4>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {order.customerName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {order.customerEmail}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {order.customerPhone}
                          </p>
                        </div>
                      </div>

                      {/* Pickup Time */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Pickup Time
                        </h4>
                        <p className={`text-base font-semibold ${!order.pickupTime ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {order.pickupTime ? formatDate(order.pickupTime) : 'ASAP'}
                        </p>
                      </div>

                      {/* Order Items */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Items
                        </h4>
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.quantity}x {item.name}
                                </p>
                                {item.modifiers && (() => {
                                  try {
                                    const modifiers = JSON.parse(item.modifiers);
                                    if (Array.isArray(modifiers) && modifiers.length > 0) {
                                      return (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          {modifiers.join(', ')}
                                        </p>
                                      );
                                    }
                                  } catch {}
                                  return null;
                                })()}
                                {item.specialInstructions && (
                                  <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-md">
                                    <FaStickyNote className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={12} />
                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-relaxed">
                                      {item.specialInstructions}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                        {order.specialInstructions && (
                          <div className="mt-4 p-3.5 bg-orange-50 dark:bg-orange-900/25 border-2 border-orange-300 dark:border-orange-700/60 rounded-lg shadow-sm">
                            <div className="flex items-start gap-2.5">
                              <FaExclamationCircle className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" size={14} />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-orange-900 dark:text-orange-200 uppercase tracking-wide mb-1">
                                  Order Note
                                </p>
                                <p className="text-sm font-medium text-orange-800 dark:text-orange-100 leading-relaxed">
                                  {order.specialInstructions}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Payment Information */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Payment
                        </h4>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {order.paymentStatus}
                          </p>
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                ${order.subtotal.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Tax</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                ${order.tax.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
                              <span className="text-xl font-bold text-[var(--color-accent)]">
                                ${order.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print Preview Modal */}
      <Modal
        isOpen={printPreviewOrder !== null}
        onClose={() => {
          setPrintPreviewOrder(null);
          setPrintPreviewData('');
        }}
        title={`Print Preview - ${printPreviewOrder?.orderNumber || ''}`}
      >
        <div className="space-y-4">
          {loadingPrintPreview ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating print preview...</p>
              </div>
            </div>
          ) : printPreviewData ? (
            <div className="bg-white text-black p-6 rounded-lg font-mono text-sm whitespace-pre-wrap border-2 border-gray-300 shadow-inner max-h-[70vh] overflow-y-auto">
              {printPreviewData}
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-12 text-center text-gray-600 dark:text-gray-400">
              No preview data available
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setPrintPreviewOrder(null);
                setPrintPreviewData('');
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

