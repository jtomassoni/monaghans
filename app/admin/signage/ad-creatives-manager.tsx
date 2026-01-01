'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import StatusBadge from '@/components/status-badge';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import ConfirmationDialog from '@/components/confirmation-dialog';
import CreativeFormModal from './creative-form-modal';

interface Asset {
  id: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  upload: {
    id: string;
    originalFilename: string;
    mimeType: string;
  };
}

interface AdCreative {
  id: string;
  campaignId: string;
  assetId: string;
  destinationUrl: string | null;
  qrEnabled: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  campaign: {
    id: string;
    name: string;
    tier: string;
  };
  asset: Asset;
}

interface AdCreativesManagerProps {
  userRole: string;
}

export default function AdCreativesManager({ userRole }: AdCreativesManagerProps) {
  const router = useRouter();
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; tier: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCreative, setEditingCreative] = useState<AdCreative | null>(null);
  const [filterCampaignId, setFilterCampaignId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [creativesRes, campaignsRes] = await Promise.all([
        fetch('/api/signage/creatives'),
        fetch('/api/signage/campaigns'),
      ]);

      if (!creativesRes.ok || !campaignsRes.ok) throw new Error('Failed to fetch data');

      const creativesData = await creativesRes.json();
      const campaignsData = await campaignsRes.json();

      setCreatives(creativesData);
      setCampaigns(campaignsData);
    } catch (error) {
      showToast('Failed to load creatives', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/signage/creatives/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete creative');
      showToast('Creative deleted', 'success');
      fetchData();
    } catch (error) {
      showToast('Failed to delete creative', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/signage/creatives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) throw new Error('Failed to update creative');
      showToast(`Creative ${!currentActive ? 'activated' : 'deactivated'}`, 'success');
      fetchData();
    } catch (error) {
      showToast('Failed to update creative', 'error');
    }
  };

  const filteredCreatives = filterCampaignId
    ? creatives.filter((c) => c.campaignId === filterCampaignId)
    : creatives;

  const groupedByCampaign = filteredCreatives.reduce((acc, creative) => {
    if (!acc[creative.campaignId]) {
      acc[creative.campaignId] = [];
    }
    acc[creative.campaignId].push(creative);
    return acc;
  }, {} as Record<string, AdCreative[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ad Creatives</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage ad creatives (images) for your campaigns
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaPlus className="w-4 h-4" />
          New Creative
        </button>
      </div>

      {/* Filter by Campaign */}
      {campaigns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Campaign
          </label>
          <select
            value={filterCampaignId}
            onChange={(e) => setFilterCampaignId(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} ({campaign.tier.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
      )}

      {creatives.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No creatives yet</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create your first creative
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCampaign).map(([campaignId, campaignCreatives]) => {
            const campaign = campaigns.find((c) => c.id === campaignId);
            return (
              <div key={campaignId} className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {campaign?.name || 'Unknown Campaign'} ({campaignCreatives.length} creative
                  {campaignCreatives.length !== 1 ? 's' : ''})
                </h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {campaignCreatives.map((creative) => (
                    <div
                      key={creative.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="mb-3">
                        <img
                          src={creative.asset.storageKey}
                          alt={creative.asset.upload.originalFilename}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={creative.active ? 'active' : 'inactive'} />
                          {creative.qrEnabled && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                              QR Code
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {creative.asset.upload.originalFilename}
                        </p>
                        {creative.destinationUrl && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-1">
                            {creative.destinationUrl}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(creative.id, creative.active)}
                          className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            creative.active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {creative.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => setEditingCreative(creative)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              id: creative.id,
                              name: creative.asset.upload.originalFilename,
                            })
                          }
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Creative"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <CreativeFormModal
        isOpen={createModalOpen || !!editingCreative}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingCreative(null);
        }}
        creative={editingCreative}
        campaignId={filterCampaignId || undefined}
        onSuccess={() => {
          fetchData();
          setCreateModalOpen(false);
          setEditingCreative(null);
        }}
      />
    </div>
  );
}

