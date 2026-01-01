'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import StatusBadge from '@/components/status-badge';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import ConfirmationDialog from '@/components/confirmation-dialog';
import CampaignFormModal from './campaign-form-modal';

interface AdCampaign {
  id: string;
  name: string;
  tier: 'FULL_SLIDE' | 'EMBEDDED';
  active: boolean;
  weight: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    creatives: number;
  };
}

interface AdCampaignsManagerProps {
  userRole: string;
}

export default function AdCampaignsManager({ userRole }: AdCampaignsManagerProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/signage/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      showToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/signage/campaigns/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete campaign');
      }
      showToast('Campaign deleted', 'success');
      fetchCampaigns();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to delete campaign',
        'error'
      );
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/signage/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) throw new Error('Failed to update campaign');
      showToast(`Campaign ${!currentActive ? 'activated' : 'deactivated'}`, 'success');
      fetchCampaigns();
    } catch (error) {
      showToast('Failed to update campaign', 'error');
    }
  };

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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ad Campaigns</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create and manage ad campaigns for full-slide and embedded ads
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaPlus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No campaigns yet</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {campaign.name}
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {campaign.tier.replace('_', ' ')}
                    </span>
                    <StatusBadge status={campaign.active ? 'active' : 'inactive'} />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Weight: {campaign.weight}</p>
                    <p>{campaign._count.creatives} creative(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(campaign.id, campaign.active)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      campaign.active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {campaign.active ? 'Active' : 'Inactive'}
                  </button>
                <button
                  onClick={() => setEditingCampaign(campaign)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                  title="Edit"
                >
                  <FaEdit className="w-4 h-4" />
                </button>
                  <button
                    onClick={() => setDeleteConfirm({ id: campaign.id, name: campaign.name })}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    title="Delete"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <CampaignFormModal
        isOpen={createModalOpen || !!editingCampaign}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingCampaign(null);
        }}
        campaign={editingCampaign}
        onSuccess={() => {
          fetchCampaigns();
          setCreateModalOpen(false);
          setEditingCampaign(null);
        }}
      />
    </div>
  );
}

