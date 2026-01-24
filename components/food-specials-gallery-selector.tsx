'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FaTimes, FaUpload, FaSpinner, FaCheck, FaImage, FaTrash } from 'react-icons/fa';
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

interface FoodSpecialsGallerySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (imagePath: string) => void;
  currentImagePath?: string;
}

export default function FoodSpecialsGallerySelector({
  isOpen,
  onClose,
  onSelect,
  currentImagePath,
}: FoodSpecialsGallerySelectorProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

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
      
      // Optionally auto-select the newly uploaded image (only if onSelect is provided)
      if (result.path && onSelect) {
        onSelect(result.path);
        onClose();
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
    e.stopPropagation(); // Prevent selecting the image when clicking delete
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      style={{ zIndex: 10051 }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <FaImage className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Food Specials Gallery
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {onSelect ? 'Select an image or upload a new one' : 'Browse and manage food special images'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={uploading}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
              aria-label="Close gallery"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragActive
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 scale-[1.02]'
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
              <div className="space-y-3">
                <FaSpinner className="w-10 h-10 text-orange-600 dark:text-orange-400 animate-spin mx-auto" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">Uploading image...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <FaUpload className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold text-base">
                    Drag and drop an image here
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    or click to browse • PNG, JPG, JPEG, WEBP, GIF (max 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FaSpinner className="w-10 h-10 text-orange-500 dark:text-orange-400 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading gallery...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FaImage className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No images yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Upload your first image to get started!
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="mb-5 flex items-center gap-6 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{images.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">In Use:</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">{images.filter(img => img.inUse).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Available:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{images.filter(img => !img.inUse).length}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image) => {
                  const isSelected = currentImagePath === image.path;
                  return (
                    <div
                      key={image.path}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 transform ${
                        isSelected
                          ? 'border-orange-500 ring-4 ring-orange-500/50 shadow-2xl scale-110 z-10'
                          : image.inUse
                          ? 'border-green-500/40 hover:border-green-500 hover:shadow-md hover:scale-105'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-400 hover:shadow-md hover:scale-105'
                      }`}
                      onClick={() => {
                        if (onSelect) {
                          onSelect(image.path);
                          onClose();
                        } else {
                          navigator.clipboard.writeText(image.path);
                          showToast('Image path copied to clipboard', 'success');
                        }
                      }}
                      title={onSelect ? 'Click to select' : 'Click to copy path'}
                    >
                      <div className="aspect-square relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
                        <Image
                          src={image.path}
                          alt={image.filename}
                          fill
                          className={`object-cover transition-transform duration-200 ${
                            isSelected ? '' : 'group-hover:scale-110'
                          }`}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        {isSelected && (
                          <>
                            <div className="absolute inset-0 bg-orange-500/40 flex items-center justify-center backdrop-blur-sm animate-pulse">
                              <div className="bg-orange-500 rounded-full p-4 shadow-2xl ring-4 ring-white/50 animate-bounce">
                                <FaCheck className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2.5 py-1 rounded-md font-bold shadow-lg backdrop-blur-sm uppercase tracking-wide">
                              Selected
                            </div>
                          </>
                        )}
                        {image.inUse && !isSelected && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold shadow-md backdrop-blur-sm">
                            In Use
                          </div>
                        )}
                        {/* Delete Button - Only show for images in food-specials directory and not in use */}
                        {image.path.startsWith('/pics/food-specials/') && !image.inUse && (
                          <button
                            onClick={(e) => handleDeleteClick(e, image)}
                            className="absolute top-2 left-2 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg backdrop-blur-sm z-10"
                            title="Delete image"
                            aria-label="Delete image"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="truncate font-medium text-xs mb-1">{image.filename}</div>
                        {image.usedBy && image.usedBy.length > 0 && (
                          <div className="text-[10px] text-gray-300 truncate mb-1">
                            Used by: {image.usedBy.slice(0, 2).join(', ')}
                            {image.usedBy.length > 2 && ` +${image.usedBy.length - 2}`}
                          </div>
                        )}
                        {image.size && (
                          <div className="text-[10px] text-gray-400">
                            {(image.size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

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

  return createPortal(modalContent, document.body);
}

