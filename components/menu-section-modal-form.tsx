'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';

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
  onDelete?: (sectionId: string) => void;
  itemCount?: number;
}

export default function MenuSectionModalForm({ isOpen, onClose, section, onSuccess, onDelete, itemCount = 0 }: MenuSectionModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: section?.name || '',
    description: section?.description || '',
    menuType: section?.menuType || 'dinner',
    isActive: section?.isActive ?? true,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    if (section) {
      const newFormData = {
        name: section.name || '',
        description: section.description || '',
        menuType: section.menuType || 'dinner',
        isActive: section.isActive ?? true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const newFormData = {
        name: '',
        description: '',
        menuType: 'dinner',
        isActive: true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [section, isOpen]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  function handleCancel() {
    if (isDirty) {
      // Reset form to initial state
      if (section) {
        const newFormData = {
          name: section.name || '',
          description: section.description || '',
          menuType: section.menuType || 'dinner',
          isActive: section.isActive ?? true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        const newFormData = {
          name: '',
          description: '',
          menuType: 'dinner',
          isActive: true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      }
    } else {
      // Close form if clean
      onClose();
    }
  }

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

  async function handleDelete() {
    if (!section?.id) return;
    
    // Check if section has items
    if (itemCount > 0) {
      showToast('Cannot delete section with menu items', 'error', `This section contains ${itemCount} menu item${itemCount === 1 ? '' : 's'}. Please remove or move all items before deleting the section.`);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/menu-sections/${section.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Menu section deleted successfully', 'success');
        onDelete?.(section.id);
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast('Failed to delete menu section', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={section ? 'Edit Section' : 'New Section'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <StatusToggle
          type="active"
          value={formData.isActive}
          onChange={(value) => setFormData({ ...formData, isActive: value })}
          label="Status"
        />

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

        <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {section?.id && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (itemCount > 0) {
                  showToast('Cannot delete section with menu items', 'error', `This section contains ${itemCount} menu item${itemCount === 1 ? '' : 's'}. Please remove or move all items before deleting the section.`);
                  return;
                }
                setShowDeleteConfirm(true);
              }}
              disabled={loading || itemCount > 0}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
              title={itemCount > 0 ? `Cannot delete: section contains ${itemCount} menu item${itemCount === 1 ? '' : 's'}` : 'Delete section'}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!!(loading || (section?.id && !isDirty))}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? (section?.id ? 'Saving...' : 'Creating...') : (section?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Menu Section"
        message={`Are you sure you want to delete "${section?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
}

