'use client';

import { useState, useEffect, FormEvent } from 'react';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import SignageUploadModal from '@/components/signage-upload-modal';

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

interface Campaign {
  id: string;
  name: string;
  tier: string;
}

interface Creative {
  id: string;
  campaignId: string;
  assetId: string;
  destinationUrl: string | null;
  qrEnabled: boolean;
  active: boolean;
  asset: Asset;
  campaign: Campaign;
}

interface CreativeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  creative?: Creative | null;
  campaignId?: string;
  onSuccess: () => void;
}

export default function CreativeFormModal({
  isOpen,
  onClose,
  creative,
  campaignId,
  onSuccess,
}: CreativeFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    campaignId: campaignId || '',
    assetId: '',
    destinationUrl: '',
    qrEnabled: false,
    active: true,
  });

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
      fetchAssets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (creative) {
      setFormData({
        campaignId: creative.campaignId,
        assetId: creative.assetId,
        destinationUrl: creative.destinationUrl || '',
        qrEnabled: creative.qrEnabled,
        active: creative.active,
      });
    } else if (campaignId) {
      setFormData({
        campaignId,
        assetId: '',
        destinationUrl: '',
        qrEnabled: false,
        active: true,
      });
    } else {
      setFormData({
        campaignId: '',
        assetId: '',
        destinationUrl: '',
        qrEnabled: false,
        active: true,
      });
    }
  }, [creative, campaignId, isOpen]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/signage/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/signage/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const handleUploadComplete = (result: { assets: Array<{ id: string; storageKey: string }> }) => {
    if (result.assets.length > 0) {
      setFormData({ ...formData, assetId: result.assets[0].id });
      setUploadModalOpen(false);
      showToast('Asset uploaded. You can now create the creative.', 'success');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = creative ? `/api/signage/creatives/${creative.id}` : '/api/signage/creatives';
      const method = creative ? 'PATCH' : 'POST';

      const body: any = {
        campaignId: formData.campaignId,
        assetId: formData.assetId,
        destinationUrl: formData.destinationUrl || null,
        qrEnabled: formData.qrEnabled,
        active: formData.active,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save creative');
      }

      showToast(creative ? 'Creative updated' : 'Creative created', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to save creative',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedAsset = assets.find((a) => a.id === formData.assetId);
  const selectedCampaign = campaigns.find((c) => c.id === formData.campaignId);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={creative ? 'Edit Creative' : 'New Creative'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign *
            </label>
            <select
              value={formData.campaignId}
              onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
              required
              disabled={!!campaignId}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.tier.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asset (Image) *
            </label>
            {selectedAsset ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    src={selectedAsset.storageKey}
                    alt={selectedAsset.upload.originalFilename}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedAsset.upload.originalFilename}
                    </p>
                    {selectedAsset.width && selectedAsset.height && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedAsset.width} × {selectedAsset.height}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, assetId: '' })}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Upload New
                  </button>
                  {assets.length > 0 && (
                    <select
                      value={formData.assetId}
                      onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Or select existing...</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.upload.originalFilename}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Upload Asset
                </button>
                {assets.length > 0 && (
                  <select
                    value={formData.assetId}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Or select existing asset...</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.upload.originalFilename}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <input type="hidden" value={formData.assetId} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Destination URL (optional)
            </label>
            <input
              type="url"
              value={formData.destinationUrl}
              onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              URL to redirect when ad is clicked
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                QR Code Enabled
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Show QR code on the ad
              </p>
            </div>
            <StatusToggle
              type="active"
              value={formData.qrEnabled}
              onChange={(value) => setFormData({ ...formData, qrEnabled: value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Active Status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Control whether this creative is active
              </p>
            </div>
            <StatusToggle
              type="active"
              value={formData.active}
              onChange={(value) => setFormData({ ...formData, active: value })}
            />
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
              disabled={loading || !formData.assetId || !formData.campaignId}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : creative ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <SignageUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
}

