'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import StatusBadge from '@/components/status-badge';
import { FaEdit, FaTrash, FaArrowUp, FaArrowDown, FaPlus } from 'react-icons/fa';
import ConfirmationDialog from '@/components/confirmation-dialog';
import SignageUploadModal from '@/components/signage-upload-modal';
import SlideFormModal from './slide-form-modal';

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
  createdAt: string;
  updatedAt: string;
}

interface ContentSlidesManagerProps {
  userRole: string;
}

export default function ContentSlidesManager({ userRole }: ContentSlidesManagerProps) {
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ id: string; storageKey: string } | null>(null);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      setLoading(true);
      // Fetch all slide types (CONTENT, AD_FULL, AD_EMBEDDED)
      const response = await fetch('/api/signage/slides');
      if (!response.ok) throw new Error('Failed to fetch slides');
      const data = await response.json();
      setSlides(data);
    } catch (error) {
      showToast('Failed to load slides', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/signage/slides/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete slide');
      showToast('Slide deleted', 'success');
      fetchSlides();
    } catch (error) {
      showToast('Failed to delete slide', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const slide = slides.find((s) => s.id === id);
    if (!slide) return;

    const currentIndex = slide.orderIndex;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetSlide = slides.find((s) => s.orderIndex === targetIndex);

    if (!targetSlide) return;

    try {
      const response = await fetch('/api/signage/slides/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: [
            { id, orderIndex: targetIndex },
            { id: targetSlide.id, orderIndex: currentIndex },
          ],
        }),
      });

      if (!response.ok) throw new Error('Failed to reorder');
      showToast('Slide order updated', 'success');
      fetchSlides();
    } catch (error) {
      showToast('Failed to reorder slide', 'error');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/signage/slides/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) throw new Error('Failed to update slide');
      showToast(`Slide ${!currentActive ? 'activated' : 'deactivated'}`, 'success');
      fetchSlides();
    } catch (error) {
      showToast('Failed to update slide', 'error');
    }
  };

  const handleUploadComplete = async (result: { uploadId: string; assets: Array<{ id: string; storageKey: string; kind: string }> }) => {
    // For PDFs, multiple assets are created (one per page)
    // For images, one asset is created
    // Open the slide form modal to let user choose slide type and configure
    setUploadModalOpen(false);
    if (result.assets.length === 1) {
      // Single asset - open form modal to configure slide type
      setSelectedAsset({ id: result.assets[0].id, storageKey: result.assets[0].storageKey });
      setEditingSlide(null); // null means new slide, we'll pass initialAssetId
    } else {
      // Multiple assets (PDF pages) - open form for first page, user can create more if needed
      setSelectedAsset({ id: result.assets[0].id, storageKey: result.assets[0].storageKey });
      setEditingSlide(null);
      showToast(`Uploaded ${result.assets.length} pages. Configure the first slide, then create more as needed.`, 'success');
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Slides</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all slides including content and ads. Upload images or PDFs to create slides.
          </p>
        </div>
        <button
          onClick={() => setEditingSlide(null)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaPlus className="w-4 h-4" />
          Create Slide
        </button>
      </div>

      {slides.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No slides yet</p>
          <button
            onClick={() => setEditingSlide(null)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create your first slide
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMove(slide.id, 'up')}
                  disabled={index === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <FaArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(slide.id, 'down')}
                  disabled={index === slides.length - 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <FaArrowDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {slide.title || `Slide ${slide.orderIndex + 1}`}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    slide.type === 'CONTENT' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : slide.type === 'AD_FULL'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  }`}>
                    {slide.type === 'CONTENT' ? 'Content' : slide.type === 'AD_FULL' ? 'Full Ad' : 'Embedded Ad'}
                  </span>
                  <StatusBadge status={slide.active ? 'active' : 'inactive'} />
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{slide.asset.upload.originalFilename}</span>
                  {slide.asset.width && slide.asset.height && (
                    <span>{slide.asset.width} × {slide.asset.height}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(slide.id, slide.active)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    slide.active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {slide.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => setEditingSlide(slide)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                  title="Edit"
                >
                  <FaEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ id: slide.id, title: slide.title || 'Slide' })}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                  title="Delete"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Slide"
        message={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <SignageUploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setSelectedAsset(null);
        }}
        onUploadComplete={handleUploadComplete}
      />

      <SlideFormModal
        isOpen={!!editingSlide || !!selectedAsset}
        onClose={() => {
          setEditingSlide(null);
          setSelectedAsset(null);
        }}
        slide={editingSlide}
        initialAssetId={selectedAsset?.id}
        onSuccess={() => {
          fetchSlides();
          setEditingSlide(null);
          setSelectedAsset(null);
        }}
      />
    </div>
  );
}

