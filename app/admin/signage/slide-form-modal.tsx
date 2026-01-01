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

interface Slide {
  id: string;
  type: string;
  assetId: string;
  asset: Asset;
  title: string | null;
  active: boolean;
  orderIndex: number;
  startAt: string | null;
  endAt: string | null;
}

interface SlideFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide?: Slide | null;
  onSuccess: () => void;
  initialAssetId?: string;
}

export default function SlideFormModal({
  isOpen,
  onClose,
  slide,
  onSuccess,
  initialAssetId,
}: SlideFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [initialAsset, setInitialAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    type: 'CONTENT' as 'CONTENT' | 'AD_FULL' | 'AD_EMBEDDED',
    assetId: '',
    title: '',
    active: true,
    startAt: '',
    endAt: '',
    // Ad-specific fields
    destinationUrl: '',
    qrEnabled: false,
  });

  useEffect(() => {
    if (slide) {
      setFormData({
        type: slide.type as 'CONTENT' | 'AD_FULL' | 'AD_EMBEDDED',
        assetId: slide.assetId,
        title: slide.title || '',
        active: slide.active,
        startAt: slide.startAt ? new Date(slide.startAt).toISOString().slice(0, 16) : '',
        endAt: slide.endAt ? new Date(slide.endAt).toISOString().slice(0, 16) : '',
        destinationUrl: '',
        qrEnabled: false,
      });
      setInitialAsset(null);
    } else {
      setFormData({
        type: 'CONTENT',
        assetId: initialAssetId || '',
        title: '',
        active: true,
        startAt: '',
        endAt: '',
        destinationUrl: '',
        qrEnabled: false,
      });
      
      // Fetch asset details if initialAssetId is provided
      if (initialAssetId && isOpen) {
        // Fetch recent assets and find the one we need
        fetch('/api/signage/assets')
          .then((res) => res.json())
          .then((assets: Asset[]) => {
            const asset = assets.find((a: Asset) => a.id === initialAssetId);
            if (asset) {
              setInitialAsset(asset);
            }
          })
          .catch(() => {
            // Silently fail - user can still select asset manually
          });
      } else {
        setInitialAsset(null);
      }
    }
  }, [slide, isOpen, initialAssetId]);

  const handleUploadComplete = (result: { assets: Array<{ id: string; storageKey: string }> }) => {
    if (result.assets.length > 0) {
      setFormData({ ...formData, assetId: result.assets[0].id });
      setUploadModalOpen(false);
      showToast('Asset uploaded', 'success');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = slide ? `/api/signage/slides/${slide.id}` : '/api/signage/slides';
      const method = slide ? 'PATCH' : 'POST';

      const body: any = {
        type: formData.type,
        assetId: formData.assetId,
        title: formData.title || null,
        active: formData.active,
      };

      if (formData.startAt) {
        body.startAt = new Date(formData.startAt).toISOString();
      }
      if (formData.endAt) {
        body.endAt = new Date(formData.endAt).toISOString();
      }

      // For ads, include ad-specific fields
      if (formData.type === 'AD_FULL' || formData.type === 'AD_EMBEDDED') {
        body.destinationUrl = formData.destinationUrl || null;
        body.qrEnabled = formData.qrEnabled;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save slide');
      }

      showToast(slide ? 'Slide updated' : 'Slide created', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to save slide',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={slide ? 'Edit Slide' : 'New Slide'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slide Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CONTENT">Content Slide</option>
              <option value="AD_FULL">Full-Slide Ad</option>
              <option value="AD_EMBEDDED">Embedded Ad</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.type === 'CONTENT' && 'Regular content slide for signage rotation'}
              {formData.type === 'AD_FULL' && 'Full-screen advertisement that appears between content slides'}
              {formData.type === 'AD_EMBEDDED' && 'Small advertisement embedded within content slides'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asset (Image or PDF) *
            </label>
            {slide?.asset || initialAsset ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    src={(slide?.asset || initialAsset)!.storageKey}
                    alt={(slide?.asset || initialAsset)!.upload.originalFilename}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {(slide?.asset || initialAsset)!.upload.originalFilename}
                    </p>
                    {(slide?.asset || initialAsset)!.width && (slide?.asset || initialAsset)!.height && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(slide?.asset || initialAsset)!.width} × {(slide?.asset || initialAsset)!.height}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(true);
                    setInitialAsset(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Upload Different Asset
                </button>
              </div>
            ) : formData.assetId ? (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Asset selected (ID: {formData.assetId})
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, assetId: '' });
                    setInitialAsset(null);
                  }}
                  className="mt-2 text-sm text-red-600 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Upload Asset
              </button>
            )}
            <input type="hidden" value={formData.assetId} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Slide title"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(formData.type === 'AD_FULL' || formData.type === 'AD_EMBEDDED') && (
            <>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  URL to open when the ad is clicked
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Enable QR Code
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Show a QR code linking to the destination URL
                  </p>
                </div>
                <StatusToggle
                  type="active"
                  value={formData.qrEnabled}
                  onChange={(value) => setFormData({ ...formData, qrEnabled: value })}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Active Status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Control whether this slide is active
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
              disabled={loading || !formData.assetId}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : slide ? 'Update' : 'Create'}
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

