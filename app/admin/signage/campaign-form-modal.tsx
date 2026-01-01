'use client';

import { useState, useEffect, FormEvent } from 'react';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';

interface Campaign {
  id: string;
  name: string;
  tier: 'FULL_SLIDE' | 'EMBEDDED';
  active: boolean;
  weight: number;
  startAt: string | null;
  endAt: string | null;
}

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
  onSuccess: () => void;
}

export default function CampaignFormModal({
  isOpen,
  onClose,
  campaign,
  onSuccess,
}: CampaignFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tier: 'FULL_SLIDE' as 'FULL_SLIDE' | 'EMBEDDED',
    active: true,
    weight: 1,
    startAt: '',
    endAt: '',
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        tier: campaign.tier,
        active: campaign.active,
        weight: campaign.weight,
        startAt: campaign.startAt ? new Date(campaign.startAt).toISOString().slice(0, 16) : '',
        endAt: campaign.endAt ? new Date(campaign.endAt).toISOString().slice(0, 16) : '',
      });
    } else {
      setFormData({
        name: '',
        tier: 'FULL_SLIDE',
        active: true,
        weight: 1,
        startAt: '',
        endAt: '',
      });
    }
  }, [campaign, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = campaign ? `/api/signage/campaigns/${campaign.id}` : '/api/signage/campaigns';
      const method = campaign ? 'PATCH' : 'POST';

      const body: any = {
        name: formData.name,
        tier: formData.tier,
        active: formData.active,
        weight: formData.weight,
      };

      if (formData.startAt) {
        body.startAt = new Date(formData.startAt).toISOString();
      }
      if (formData.endAt) {
        body.endAt = new Date(formData.endAt).toISOString();
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save campaign');
      }

      showToast(campaign ? 'Campaign updated' : 'Campaign created', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to save campaign',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={campaign ? 'Edit Campaign' : 'New Campaign'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Campaign Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ad Type *
          </label>
          <select
            value={formData.tier}
            onChange={(e) => setFormData({ ...formData, tier: e.target.value as 'FULL_SLIDE' | 'EMBEDDED' })}
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="FULL_SLIDE">Full Slide</option>
            <option value="EMBEDDED">Embedded</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weight
          </label>
          <input
            type="number"
            min="1"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Higher weight = more frequent display (default: 1)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Active Status
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Control whether this campaign is active
            </p>
          </div>
          <StatusToggle
            type="active"
            value={formData.active}
            onChange={(value) => setFormData({ ...formData, active: value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date/Time (optional)
            </label>
            <input
              type="datetime-local"
              value={formData.startAt}
              onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date/Time (optional)
            </label>
            <input
              type="datetime-local"
              value={formData.endAt}
              onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : campaign ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

