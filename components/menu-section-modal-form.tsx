'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';

interface MenuSection {
  id?: string;
  name: string;
  description: string;
  menuType: string;
  displayOrder: number;
  isActive: boolean;
}

interface MenuSectionModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  section?: MenuSection;
  onSuccess?: () => void;
}

export default function MenuSectionModalForm({ isOpen, onClose, section, onSuccess }: MenuSectionModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: section?.name || '',
    description: section?.description || '',
    menuType: section?.menuType || 'dinner',
    isActive: section?.isActive ?? true,
  });

  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name || '',
        description: section.description || '',
        menuType: section.menuType || 'dinner',
        isActive: section.isActive ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        menuType: 'dinner',
        isActive: true,
      });
    }
  }, [section, isOpen]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = section?.id ? `/api/menu-sections/${section.id}` : '/api/menu-sections';
      const method = section?.id ? 'PUT' : 'POST';

      // For new sections, don't send menuType (API will default to 'dinner')
      // For editing, preserve the existing menuType if it exists
      const dataToSend = section?.id 
        ? { ...formData, menuType: section.menuType || 'dinner' }
        : (({ menuType, ...rest }) => rest)(formData);
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        router.refresh();
        showToast(
          section?.id ? 'Menu section updated successfully' : 'Menu section created successfully',
          'success'
        );
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          section?.id ? 'Failed to update menu section' : 'Failed to create menu section',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the menu section.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={section ? 'Edit Section' : 'New Section'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Section Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded cursor-pointer"
            />
            <span className="text-sm">Active</span>
          </label>
        </div>

        <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? (section?.id ? 'Saving...' : 'Creating...') : (section?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

