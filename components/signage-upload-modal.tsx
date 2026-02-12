'use client';

import { useState, useRef } from 'react';
import { showToast } from './toast';
import { FaTimes, FaUpload, FaSpinner } from 'react-icons/fa';

interface Asset {
  id: string;
  width: number;
  height: number;
  storageKey: string;
  kind: 'IMAGE' | 'PDF_PAGE_IMAGE';
}

interface UploadResult {
  uploadId: string;
  upload: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
  };
  assets: Asset[];
}

interface SignageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (result: UploadResult) => void;
}

export default function SignageUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: SignageUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/signage/uploads', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result: UploadResult = await response.json();
      setProgress(100);
      showToast('Upload successful', 'success');
      onUploadComplete(result);
      // Don't call onClose() here - let the parent component handle closing
      // after it processes the upload result
    } catch (error) {
      console.error('Upload error:', error);
      showToast(
        error instanceof Error ? error.message : 'Upload failed',
        'error'
      );
    } finally {
      setUploading(false);
      setProgress(0);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload File</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={uploading}
            />

            {uploading ? (
              <div className="space-y-4">
                <FaSpinner className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">Uploading...</p>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <FaUpload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Drag and drop a file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Supports: PNG, JPG, JPEG, WEBP, GIF, PDF
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Max size: 10MB (images) or 20MB (PDFs)
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploading && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              <p>Processing file... This may take a moment for PDFs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

