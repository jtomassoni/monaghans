'use client';

import { useState } from 'react';
import { FaUpload, FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { ImportPlatform } from '@/lib/menu-import-adapters';
import Modal from './modal';

interface MenuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const PLATFORMS: Array<{ value: ImportPlatform; label: string; description: string }> = [
  { value: 'csv', label: 'CSV File', description: 'Comma-separated values file' },
  { value: 'json', label: 'JSON File', description: 'JSON format menu data' },
  { value: 'toast', label: 'Toast POS', description: 'Toast POS export format' },
  { value: 'square', label: 'Square POS', description: 'Square POS catalog export' },
  { value: 'chownow', label: 'ChowNow', description: 'ChowNow menu export' },
  { value: 'olo', label: 'Olo', description: 'Olo menu format' },
  { value: 'generic', label: 'Generic/Unknown', description: 'Auto-detect format' },
];

export default function MenuImportModal({ isOpen, onClose, onImportComplete }: MenuImportModalProps) {
  const [platform, setPlatform] = useState<ImportPlatform>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'create' | 'update' | 'merge'>('create');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported?: { sections: number; items: number };
    errors?: string[];
    warnings?: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      
      // Auto-detect platform based on file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        setPlatform('csv');
      } else if (ext === 'json') {
        setPlatform('json');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform', platform);
      formData.append('importMode', importMode);

      const response = await fetch('/api/menu/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          errors: data.errors || [data.error || 'Import failed'],
          warnings: data.warnings,
        });
      } else {
        setResult({
          success: true,
          imported: data.imported,
          errors: data.errors,
          warnings: data.warnings,
        });
        
        // Refresh menu data after successful import
        if (onImportComplete) {
          setTimeout(() => {
            onImportComplete();
          }, 1000);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import menu'],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setPlatform('csv');
    setImportMode('create');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Menu">
      <div className="space-y-6">
        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as ImportPlatform)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} - {p.description}
              </option>
            ))}
          </select>
        </div>

        {/* Import Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Import Mode
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="create"
                checked={importMode === 'create'}
                onChange={(e) => setImportMode(e.target.value as 'create')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Create New - Only add new items (skip existing)
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="merge"
                checked={importMode === 'merge'}
                onChange={(e) => setImportMode(e.target.value as 'merge')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Merge - Add new items and update existing sections
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="update"
                checked={importMode === 'update'}
                onChange={(e) => setImportMode(e.target.value as 'update')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Update - Update existing sections and add new items
              </span>
            </label>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Menu File
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <div className="space-y-1 text-center">
              <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv,.json,.txt"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                CSV, JSON up to 10MB
              </p>
              {file && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Format Help */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <FaInfoCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Expected Formats:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>CSV:</strong> section_name,item_name,description,price,price_notes,modifiers,menu_type,is_available</li>
                <li><strong>JSON:</strong> {`{ "sections": [{ "name": "...", "items": [...] }] }`}</li>
                <li><strong>Platform formats:</strong> Export from your POS/ordering system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className={`rounded-lg p-4 ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start">
              {result.success ? (
                <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <FaExclamationTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <div className="flex-1">
                {result.success ? (
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                      Import Successful!
                    </p>
                    {result.imported && (
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Imported {result.imported.sections} section(s) and {result.imported.items} item(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                      Import Failed
                    </p>
                    {result.errors && result.errors.length > 0 && (
                      <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                        {result.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Warnings:
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                      {result.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              onClick={handleImport}
              disabled={!file || isImporting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <FaUpload />
                  <span>Import Menu</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

