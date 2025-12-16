'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaPlus, FaSync, FaLink, FaBox, FaShoppingCart, FaEdit, FaTrash } from 'react-icons/fa';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';

interface SupplierDetailProps {
  supplier: {
    id: string;
    name: string;
    provider: string;
    displayName: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
    connections: Array<{
      id: string;
      name: string;
      isActive: boolean;
      lastSyncAt: Date | string | null;
      lastSyncError: string | null;
      syncFrequency: string;
    }>;
    products: Array<{
      id: string;
      name: string;
      supplierSku: string;
      currentPrice: number;
      unit: string;
      isAvailable: boolean;
      ingredient: {
        id: string;
        name: string;
      } | null;
    }>;
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      orderDate: Date | string;
      total: number;
    }>;
    _count: {
      products: number;
      orders: number;
    };
  };
}

export default function SupplierDetail({ supplier }: SupplierDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'connections' | 'products' | 'orders'>('overview');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [connectionFormData, setConnectionFormData] = useState({
    name: '',
    credentials: '',
    config: '',
    syncFrequency: 'weekly',
  });

  const handleSyncCatalog = async (connectionId?: string) => {
    setIsSyncLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(
          `Synced ${result.syncedCount} products, matched ${result.matchedCount} to ingredients`,
          'success'
        );
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to sync catalog', 'error', error.error || 'Please try again.');
      }
    } catch (error) {
      showToast('Sync failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setIsSyncLoading(false);
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connectionFormData.name,
          credentials: JSON.parse(connectionFormData.credentials),
          config: connectionFormData.config ? JSON.parse(connectionFormData.config) : null,
          syncFrequency: connectionFormData.syncFrequency,
        }),
      });

      if (res.ok) {
        showToast('Connection created successfully', 'success');
        setIsConnectionModalOpen(false);
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to create connection', 'error', error.error || 'Please check your input.');
      }
    } catch (error) {
      showToast('Request failed', 'error', error instanceof Error ? error.message : 'Invalid JSON format.');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 pt-16 md:pt-0 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/suppliers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {supplier.displayName || supplier.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {supplier.provider}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-4 sm:px-6 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm relative z-10">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'connections', label: 'Connections' },
            { id: 'products', label: 'Products' },
            { id: 'orders', label: 'Orders' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FaBox className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Products</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplier._count.products}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <FaShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Orders</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplier._count.orders}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <FaLink className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Connections</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.connections.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              {(supplier.phone || supplier.email || supplier.website || supplier.address) && (
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {supplier.phone && <p>📞 {supplier.phone}</p>}
                    {supplier.email && <p>✉️ {supplier.email}</p>}
                    {supplier.website && (
                      <p>
                        🌐 <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                          {supplier.website}
                        </a>
                      </p>
                    )}
                    {supplier.address && <p>📍 {supplier.address}</p>}
                  </div>
                </div>
              )}

              {/* Notes */}
              {supplier.notes && (
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{supplier.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Connections</h2>
                <button
                  onClick={() => setIsConnectionModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <FaPlus className="w-3.5 h-3.5" />
                  <span>Add Connection</span>
                </button>
              </div>

              {supplier.connections.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg font-medium">No connections configured</p>
                  <p className="text-sm mt-1">Add a connection to sync products and place orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supplier.connections.map(connection => (
                    <div
                      key={connection.id}
                      className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{connection.name}</h3>
                          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p>Sync Frequency: {connection.syncFrequency}</p>
                            {connection.lastSyncAt && (
                              <p>Last Sync: {new Date(connection.lastSyncAt).toLocaleString()}</p>
                            )}
                            {connection.lastSyncError && (
                              <p className="text-red-600 dark:text-red-400">Error: {connection.lastSyncError}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSyncCatalog(connection.id)}
                            disabled={isSyncLoading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <FaSync className={`w-3.5 h-3.5 ${isSyncLoading ? 'animate-spin' : ''}`} />
                            <span>Sync</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Product Catalog ({supplier.products.length} shown)
                </h2>
                <button
                  onClick={() => handleSyncCatalog()}
                  disabled={isSyncLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <FaSync className={`w-3.5 h-3.5 ${isSyncLoading ? 'animate-spin' : ''}`} />
                  <span>Sync Catalog</span>
                </button>
              </div>

              {supplier.products.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg font-medium">No products synced</p>
                  <p className="text-sm mt-1">Sync the catalog to load products</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supplier.products.map(product => (
                    <div
                      key={product.id}
                      className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">SKU: {product.supplierSku}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          ${product.currentPrice.toFixed(2)}/{product.unit}
                        </span>
                        {product.ingredient && (
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            Matched
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
                <button
                  onClick={() => router.push(`/admin/purchase-orders?supplierId=${supplier.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <FaPlus className="w-3.5 h-3.5" />
                  <span>New Order</span>
                </button>
              </div>

              {supplier.orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm mt-1">Create a purchase order to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supplier.orders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => router.push(`/admin/purchase-orders/${order.id}`)}
                      className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{order.orderNumber}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ${order.total.toFixed(2)}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            order.status === 'submitted' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Connection Modal */}
      <Modal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        title="Add API Connection"
      >
        <form onSubmit={handleCreateConnection} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Connection Name *
            </label>
            <input
              type="text"
              value={connectionFormData.name}
              onChange={(e) => setConnectionFormData({ ...connectionFormData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., Main Account, Secondary Location"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Credentials (JSON) *
            </label>
            <textarea
              value={connectionFormData.credentials}
              onChange={(e) => setConnectionFormData({ ...connectionFormData, credentials: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              rows={6}
              placeholder='{"apiKey": "your-key", "apiSecret": "your-secret"}'
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter API credentials as JSON. In production, these will be encrypted.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Configuration (JSON)
            </label>
            <textarea
              value={connectionFormData.config}
              onChange={(e) => setConnectionFormData({ ...connectionFormData, config: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              rows={4}
              placeholder='{"locationId": "123", "warehouseCode": "WH01"}'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sync Frequency
            </label>
            <select
              value={connectionFormData.syncFrequency}
              onChange={(e) => setConnectionFormData({ ...connectionFormData, syncFrequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsConnectionModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 rounded-lg transition-colors"
            >
              Create Connection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

