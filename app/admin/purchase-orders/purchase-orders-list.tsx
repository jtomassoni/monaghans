'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import Modal from '@/components/modal';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import { showToast } from '@/components/toast';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: Date | string;
  requestedDate: Date | string | null;
  receivedDate: Date | string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes: string | null;
  supplier: {
    id: string;
    name: string;
    displayName: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  _count: {
    items: number;
  };
}

interface PurchaseOrdersListProps {
  initialOrders: PurchaseOrder[];
  suppliers: Array<{
    id: string;
    name: string;
    displayName: string | null;
  }>;
}

const STATUSES = ['draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled'];

export default function PurchaseOrdersList({ initialOrders, suppliers }: PurchaseOrdersListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  useEffect(() => {
    setOrders(initialOrders);
    setFilteredOrders(initialOrders);
  }, [initialOrders]);

  const sortOptions: SortOption<PurchaseOrder>[] = [
    { label: 'Date (Newest)', value: 'orderDate', sortFn: (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime() },
    { label: 'Date (Oldest)', value: 'orderDate', sortFn: (a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime() },
    { label: 'Total (High to Low)', value: 'total', sortFn: (a, b) => b.total - a.total },
    { label: 'Total (Low to High)', value: 'total', sortFn: (a, b) => a.total - b.total },
    { label: 'Supplier (A-Z)', value: 'supplier.name' },
  ];

  const filterOptions: FilterOption<PurchaseOrder>[] = [
    { label: 'All Orders', value: 'all', filterFn: () => true },
    ...STATUSES.map(status => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: status,
      filterFn: (o: PurchaseOrder) => o.status === status,
    })),
    ...suppliers.map(supplier => ({
      label: supplier.displayName || supplier.name,
      value: supplier.id,
      filterFn: (o: PurchaseOrder) => o.supplier.id === supplier.id,
    })),
  ];

  const handleSubmitOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to submit this order to the supplier?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        showToast('Order submitted successfully', 'success');
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to submit order', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Submit failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
      case 'submitted':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'confirmed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'shipped':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'received':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Purchase Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
              if (e.target.value) {
                router.push(`/admin/purchase-orders?supplierId=${e.target.value}`);
              } else {
                router.push('/admin/purchase-orders');
              }
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.displayName || supplier.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => router.push('/admin/purchase-orders/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Search, Sort, Filter */}
      <SearchSortFilter
        data={filteredOrders}
        onFilteredDataChange={setFilteredOrders}
        sortOptions={sortOptions}
        filterOptions={filterOptions}
        searchPlaceholder="Search orders..."
        searchKeys={['orderNumber', 'supplier.name', 'supplier.displayName']}
      />

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No purchase orders found</p>
            <p className="text-sm mt-1">Create your first purchase order to get started</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/admin/purchase-orders/${order.id}`)}
              className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{order.orderNumber}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {order.supplier.displayName || order.supplier.name}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Date: {new Date(order.orderDate).toLocaleDateString()}</span>
                    {order.requestedDate && (
                      <span>Requested: {new Date(order.requestedDate).toLocaleDateString()}</span>
                    )}
                    {order.receivedDate && (
                      <span>Received: {new Date(order.receivedDate).toLocaleDateString()}</span>
                    )}
                    <span>{order._count.items} item{order._count.items !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    ${order.total.toFixed(2)}
                  </p>
                  {order.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmitOrder(order.id);
                      }}
                      disabled={loading}
                      className="text-xs px-3 py-1 bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
