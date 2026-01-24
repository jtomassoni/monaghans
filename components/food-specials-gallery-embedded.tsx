'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaUpload, FaSpinner, FaCheck, FaImage, FaTrash } from 'react-icons/fa';
import { showToast } from './toast';
import ConfirmationDialog from './confirmation-dialog';

interface GalleryImage {
  filename: string;
  path: string;
  size?: number;
  modified: string;
  inUse?: boolean;
  usedBy?: string[];
}

interface FoodSpecialsGalleryEmbeddedProps {
  currentImagePath?: string;
  onSelect: (imagePath: string) => void;
  className?: string;
}

export default function FoodSpecialsGalleryEmbedded({
  currentImagePath,
  onSelect,
  className = '',
}: FoodSpecialsGalleryEmbeddedProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/food-specials-gallery');
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      const data = await response.json();
      setImages(data);
    } catch (error) {
      console.error('Error fetching images:', error);
      showToast('Failed to load gallery images', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/food-specials-gallery', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      showToast('Image uploaded successfully', 'success');
      
      // Refresh the gallery
      await fetchImages();
      
      // Auto-select the newly uploaded image
      if (result.path) {
        onSelect(result.path);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast(
        error instanceof Error ? error.message : 'Upload failed',
        'error'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, image: GalleryImage) => {
    e.stopPropagation();
    setImageToDelete(image);
  };

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/food-specials-gallery?path=${encodeURIComponent(imageToDelete.path)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.inUse && error.usedBy) {
          showToast(
            `Cannot delete: Image is used by ${error.usedBy.join(', ')}`,
            'error'
          );
        } else {
          throw new Error(error.error || 'Delete failed');
        }
      } else {
        showToast('Image deleted successfully', 'success');
        await fetchImages();
        // If deleted image was selected, clear selection
        if (currentImagePath === imageToDelete.path) {
          onSelect('');
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to delete image',
        'error'
      );
    } finally {
      setDeleting(false);
      setImageToDelete(null);
    }
  };

  const selectedImage = images.find(img => img.path === currentImagePath);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current Selection Display */}
      {selectedImage && (
        <div className="rounded-lg border-2 border-orange-500 bg-orange-50/50 dark:bg-orange-900/20 p-3 ring-2 ring-orange-500/30 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <FaCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">Selected Image</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-orange-500 ring-2 ring-orange-500/30 shadow-md">
              <Image
                src={selectedImage.path}
                alt={selectedImage.filename}
                fill
                className="object-cover"
                sizes="64px"
              />
              <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                <FaCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {selectedImage.filename}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {selectedImage.path}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelect('')}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
          dragActive
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-2">
            <FaSpinner className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-spin mx-auto" />
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <FaUpload className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Drag and drop an image here
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                or click to browse • PNG, JPG, JPEG, WEBP, GIF (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Toggle */}
      {images.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium text-gray-900 dark:text-white"
        >
          <div className="flex items-center gap-2">
            <FaImage className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span>Browse Gallery ({images.length} images)</span>
          </div>
          <span className="text-gray-500 dark:text-gray-400">
            {expanded ? '▼' : '▶'}
          </span>
        </button>
      )}

      {/* Gallery Grid */}
      {expanded && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FaSpinner className="w-8 h-8 text-orange-500 dark:text-orange-400 animate-spin mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading gallery...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaImage className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                No images yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload your first image to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-2 border border-gray-200/70 dark:border-gray-700/60 rounded-lg bg-gray-50 dark:bg-gray-900/20">
              {images.map((image) => {
                const isSelected = currentImagePath === image.path;
                return (
                  <div
                    key={image.path}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-orange-500 ring-4 ring-orange-500/50 shadow-xl scale-[1.05] z-10'
                        : image.inUse
                        ? 'border-green-500/40 hover:border-green-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-400'
                    }`}
                    onClick={() => onSelect(image.path)}
                    title={isSelected ? 'Selected' : 'Click to select'}
                  >
                    <div className="aspect-square relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
                      <Image
                        src={image.path}
                        alt={image.filename}
                        fill
                        className={`object-cover transition-transform duration-200 ${
                          isSelected ? '' : 'group-hover:scale-110'
                        }`}
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {isSelected && (
                        <>
                          <div className="absolute inset-0 bg-orange-500/40 flex items-center justify-center backdrop-blur-sm animate-pulse">
                            <div className="bg-orange-500 rounded-full p-3 shadow-2xl ring-4 ring-white/50 animate-bounce">
                              <FaCheck className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-md font-bold shadow-lg backdrop-blur-sm uppercase tracking-wide">
                            Selected
                          </div>
                        </>
                      )}
                      {image.inUse && !isSelected && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold shadow-md backdrop-blur-sm">
                          In Use
                        </div>
                      )}
                      {/* Delete Button - Only show for images in food-specials directory and not in use */}
                      {image.path.startsWith('/pics/food-specials/') && !image.inUse && (
                        <button
                          onClick={(e) => handleDeleteClick(e, image)}
                          className="absolute top-1 left-1 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg backdrop-blur-sm z-10"
                          title="Delete image"
                          aria-label="Delete image"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={imageToDelete !== null}
        onClose={() => {
          if (!deleting) {
            setImageToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={imageToDelete?.inUse ? 'Cannot Delete Image' : 'Delete Image'}
        message={
          imageToDelete
            ? imageToDelete.inUse
              ? `"${imageToDelete.filename}" is currently used by: ${imageToDelete.usedBy?.join(', ') || 'a food special'}. Please remove it from the food special(s) first before deleting.`
              : `Are you sure you want to delete "${imageToDelete.filename}"? This action cannot be undone.`
            : ''
        }
        confirmText={deleting ? 'Deleting...' : imageToDelete?.inUse ? 'OK' : 'Delete'}
        cancelText={imageToDelete?.inUse ? '' : 'Cancel'}
        variant={imageToDelete?.inUse ? 'warning' : 'danger'}
        disabled={deleting || (imageToDelete?.inUse ?? false)}
      />
    </div>
  );
}
