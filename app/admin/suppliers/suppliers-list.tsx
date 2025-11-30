'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaLink, FaSync, FaBox, FaShoppingCart } from 'react-icons/fa';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import StatusToggle from '@/components/status-toggle';
import { showToast } from '@/components/toast';

interface Supplier {
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
  createdAt: Date | string;
  updatedAt: Date | string;
  _count: {
    products: number;
    orders: number;
    connections: number;
  };
}

interface SuppliersListProps {
  initialSuppliers: Supplier[];
}

const PROVIDERS = ['sysco', 'usfoods', 'costco', 'custom'];

export default function SuppliersList({ initialSuppliers }: SuppliersListProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    setSuppliers(initialSuppliers);
    setFilteredSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  useEffect(() => {
    const filtered = showInactive 
      ? suppliers 
      : suppliers.filter(s => s.isActive);
    setFilteredSuppliers(filtered);
  }, [suppliers, showInactive]);


  const [formData, setFormData] = useState({
    name: '',
    provider: 'custom',
    displayName: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true,
  });

  const handleNew = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      provider: 'custom',
      displayName: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      provider: supplier.provider,
      displayName: supplier.displayName || '',
      website: supplier.website || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingSupplier 
        ? `/api/suppliers/${editingSupplier.id}` 
        : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          website: formData.website || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        // Fetch fresh data from API
        try {
          const refreshRes = await fetch('/api/suppliers');
          if (refreshRes.ok) {
            const freshData = await refreshRes.json();
            setSuppliers(freshData);
          }
        } catch (error) {
          console.error('Failed to refresh suppliers:', error);
        }
        
        router.refresh();
        showToast(
          editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully',
          'success'
        );
        setIsModalOpen(false);
      } else {
        const error = await res.json();
        showToast(
          editingSupplier ? 'Failed to update supplier' : 'Failed to create supplier',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the supplier.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Fetch fresh data from API
        try {
          const refreshRes = await fetch('/api/suppliers');
          if (refreshRes.ok) {
            const freshData = await refreshRes.json();
            setSuppliers(freshData);
          }
        } catch (error) {
          console.error('Failed to refresh suppliers:', error);
        }
        
        router.refresh();
        showToast('Supplier deleted successfully', 'success');
        setDeleteConfirmation(null);
      } else {
        const error = await res.json();
        showToast('Failed to delete supplier', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Suppliers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Show inactive</span>
          </label>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>New Supplier</span>
          </button>
        </div>
      </div>


      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No suppliers found</p>
            <p className="text-sm mt-1">Create your first supplier to get started</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {supplier.displayName || supplier.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {supplier.provider}
                  </p>
                </div>
                <StatusToggle
                  type="available"
                  value={supplier.isActive}
                  onChange={async (value) => {
                    try {
                      const res = await fetch(`/api/suppliers/${supplier.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...supplier, isActive: value }),
                      });
                      if (res.ok) {
                        router.refresh();
                        showToast('Supplier updated', 'success');
                      }
                    } catch (error) {
                      showToast('Failed to update supplier', 'error');
                    }
                  }}
                  className="shrink-0"
                />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <FaBox className="w-3.5 h-3.5" />
                  <span>{supplier._count.products} products</span>
                </div>
                <div className="flex items-center gap-1">
                  <FaShoppingCart className="w-3.5 h-3.5" />
                  <span>{supplier._count.orders} orders</span>
                </div>
                <div className="flex items-center gap-1">
                  <FaLink className="w-3.5 h-3.5" />
                  <span>{supplier._count.connections} connections</span>
                </div>
              </div>

              {/* Contact Info */}
              {(supplier.phone || supplier.email || supplier.website) && (
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {supplier.phone && <p>📞 {supplier.phone}</p>}
                  {supplier.email && <p>✉️ {supplier.email}</p>}
                  {supplier.website && (
                    <p>
                      🌐 <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        {supplier.website}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => router.push(`/admin/suppliers/${supplier.id}`)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleEdit(supplier)}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Edit supplier"
                >
                  <FaEdit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirmation(supplier)}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete supplier"
                >
                  <FaTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'New Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              {PROVIDERS.map(provider => (
                <option key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  {provider !== 'custom' ? ' (Coming Soon)' : ''}
                </option>
              ))}
            </select>
            {formData.provider !== 'custom' && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Coming Soon:</strong> Automated catalog sync for {formData.provider.charAt(0).toUpperCase() + formData.provider.slice(1)} is not yet available. You can manually add products and create purchase orders.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Optional display name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingSupplier ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteConfirmation?.displayName || deleteConfirmation?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
