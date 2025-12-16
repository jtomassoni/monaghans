'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaSync, FaCheckCircle, FaTimesCircle, FaExternalLinkAlt } from 'react-icons/fa';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import StatusToggle from '@/components/status-toggle';
import { showToast } from '@/components/toast';

interface POSIntegration {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  syncFrequency: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sales: number;
  };
}

const POS_PROVIDERS = [
  { value: 'square', label: 'Square', docs: 'https://developer.squareup.com/docs' },
  { value: 'toast', label: 'Toast', docs: 'https://developer.toasttab.com/docs' },
  { value: 'clover', label: 'Clover', docs: 'https://docs.clover.com/' },
  { value: 'lightspeed', label: 'Lightspeed', docs: 'https://developers.lightspeedhq.com/' },
  { value: 'touchbistro', label: 'TouchBistro', docs: 'https://developer.touchbistro.com/' },
];

export default function POSIntegrationsClient() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<POSIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<POSIntegration | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<POSIntegration | null>(null);
  const [syncingIntegration, setSyncingIntegration] = useState<string | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    provider: 'square',
    name: '',
    accessToken: '',
    locationId: '',
    syncFrequency: 'daily',
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/pos-integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingIntegration(null);
    setFormData({
      provider: 'square',
      name: '',
      accessToken: '',
      locationId: '',
      syncFrequency: 'daily',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (integration: POSIntegration) => {
    setEditingIntegration(integration);
    // Note: We can't show existing credentials for security
    setFormData({
      provider: integration.provider,
      name: integration.name,
      accessToken: '', // Don't show existing token
      locationId: '',
      syncFrequency: integration.syncFrequency,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const credentials = {
        accessToken: formData.accessToken,
        locationId: formData.locationId || undefined,
      };

      const url = editingIntegration
        ? `/api/pos-integrations/${editingIntegration.id}`
        : '/api/pos-integrations';
      const method = editingIntegration ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formData.provider,
          name: formData.name,
          credentials: editingIntegration ? credentials : credentials, // Only update if provided
          syncFrequency: formData.syncFrequency,
        }),
      });

      if (res.ok) {
        router.refresh();
        showToast(
          editingIntegration ? 'Integration updated successfully' : 'Integration created successfully',
          'success'
        );
        setIsModalOpen(false);
        fetchIntegrations();
      } else {
        const error = await res.json();
        showToast(
          editingIntegration ? 'Failed to update integration' : 'Failed to create integration',
          'error',
          error.error || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast('Request failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/pos-integrations/${deleteConfirmation.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
        showToast('Integration deleted successfully', 'success');
        setDeleteConfirmation(null);
        fetchIntegrations();
      } else {
        const error = await res.json();
        showToast('Failed to delete integration', 'error', error.error || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (integrationId: string) => {
    setSyncingIntegration(integrationId);
    try {
      const res = await fetch(`/api/pos-integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          `Sync completed: ${data.imported} imported, ${data.skipped} skipped`,
          'success'
        );
        fetchIntegrations();
      } else {
        const error = await res.json();
        showToast('Sync failed', 'error', error.error || 'Please try again.');
      }
    } catch (error) {
      showToast('Sync failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setSyncingIntegration(null);
    }
  };

  const handleTest = async (integrationId: string) => {
    setTestingIntegration(integrationId);
    try {
      const res = await fetch(`/api/pos-integrations/${integrationId}/sync`);
      if (res.ok) {
        const data = await res.json();
        showToast(
          data.connected ? 'Connection successful' : 'Connection failed',
          data.connected ? 'success' : 'error'
        );
      } else {
        showToast('Test failed', 'error', 'Please check your credentials.');
      }
    } catch (error) {
      showToast('Test failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setTestingIntegration(null);
    }
  };

  const providerInfo = POS_PROVIDERS.find(p => p.value === formData.provider);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 pt-16 md:pt-0 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                POS Integrations
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-full">
                Square Only
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Connect and import sales data from your POS system. Square integration available now; other providers coming soon.
            </p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>New Integration</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {loading && integrations.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading integrations...</p>
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-12 bg-white/90 dark:bg-gray-900/40 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 shadow-sm">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No POS integrations</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Connect your POS system to import sales data for analytics
              </p>
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Add Integration
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-white/90 dark:bg-gray-900/40 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 shadow-sm p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {integration.provider}
                      </p>
                    </div>
                    <StatusToggle
                      type="available"
                      value={integration.isActive}
                      onChange={async (value) => {
                        try {
                          const res = await fetch(`/api/pos-integrations/${integration.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isActive: value }),
                          });
                          if (res.ok) {
                            router.refresh();
                            showToast('Integration updated', 'success');
                            fetchIntegrations();
                          }
                        } catch (error) {
                          showToast('Failed to update integration', 'error');
                        }
                      }}
                      className="shrink-0"
                    />
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Sync Frequency:</span>
                      <span className="text-gray-900 dark:text-white capitalize">
                        {integration.syncFrequency}
                      </span>
                    </div>
                    {integration._count && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Sales Imported:</span>
                        <span className="text-gray-900 dark:text-white">
                          {integration._count.sales.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {integration.lastSyncAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Last Sync:</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(integration.lastSyncAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {integration.lastSyncError && (
                      <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
                        <FaTimesCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{integration.lastSyncError}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleTest(integration.id)}
                      disabled={testingIntegration === integration.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                    >
                      {testingIntegration === integration.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          Testing...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="w-3 h-3" />
                          Test
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingIntegration === integration.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                    >
                      {syncingIntegration === integration.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          Syncing...
                        </>
                      ) : (
                        <>
                          <FaSync className="w-3 h-3" />
                          Sync
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(integration)}
                      className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <FaEdit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation(integration)}
                      className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIntegration ? 'Edit POS Integration' : 'New POS Integration'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="provider" className="text-sm font-medium text-gray-900 dark:text-white">
                POS Provider *
              </label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                required
                disabled={!!editingIntegration}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                {POS_PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label} {provider.value !== 'square' ? '(Coming Soon)' : ''}
                  </option>
                ))}
              </select>
              {formData.provider !== 'square' && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Coming Soon:</strong> {POS_PROVIDERS.find(p => p.value === formData.provider)?.label} integration is not yet available. Only Square is currently supported.
                  </p>
                </div>
              )}
              {providerInfo && (
                <a
                  href={providerInfo.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View API Documentation <FaExternalLinkAlt className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                Integration Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Main Location Square"
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="accessToken" className="text-sm font-medium text-gray-900 dark:text-white">
                Access Token / API Key *
                {editingIntegration && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    (Leave blank to keep existing)
                  </span>
                )}
              </label>
              <input
                id="accessToken"
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                required={!editingIntegration}
                placeholder="Enter your POS API access token"
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Get your access token from your POS provider's developer portal
              </p>
            </div>

            {formData.provider === 'square' && (
              <div className="space-y-2">
                <label htmlFor="locationId" className="text-sm font-medium text-gray-900 dark:text-white">
                  Location ID
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Optional)</span>
                </label>
                <input
                  id="locationId"
                  type="text"
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  placeholder="Square location ID (if multi-location)"
                  className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="syncFrequency" className="text-sm font-medium text-gray-900 dark:text-white">
                Sync Frequency
              </label>
              <select
                id="syncFrequency"
                value={formData.syncFrequency}
                onChange={(e) => setFormData({ ...formData, syncFrequency: e.target.value })}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                <option value="manual">Manual Only</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading
                ? editingIntegration
                  ? 'Saving...'
                  : 'Creating...'
                : editingIntegration
                ? 'Save'
                : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleDelete}
        title="Delete POS Integration"
        message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This will not delete imported sales data, but you will no longer be able to sync new data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

