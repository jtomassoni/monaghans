'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

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
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty && isOpen);

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Section Status</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
                Control whether this section appears on your public menu.
              </p>
            </div>
            <StatusToggle
              type="active"
              value={formData.isActive}
              onChange={(value) => setFormData({ ...formData, isActive: value })}
              className="shrink-0"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                Section Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-white">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm flex flex-wrap items-center justify-end gap-3 sticky bottom-0 -mx-6 px-6 bg-white dark:bg-gray-800">
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
              className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer"
              title={itemCount > 0 ? `Cannot delete: section contains ${itemCount} menu item${itemCount === 1 ? '' : 's'}` : 'Delete section'}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!!(loading || (section?.id && !isDirty))}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
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

