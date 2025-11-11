'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StatusToggle from '@/components/status-toggle';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';

interface MenuItem {
  id?: string;
  sectionId: string;
  name: string;
  description: string;
  price: string;
  priceNotes: string;
  modifiers: string[];
  isAvailable: boolean;
  displayOrder: number;
}

export default function MenuItemForm({ item, sections }: { item?: MenuItem; sections: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionIdParam = searchParams.get('sectionId');
  
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    sectionId: item?.sectionId || sectionIdParam || '',
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    priceNotes: item?.priceNotes || '',
    modifiers: item?.modifiers || [],
    isAvailable: item?.isAvailable ?? true,
    displayOrder: item?.displayOrder ?? 0,
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [modifierText, setModifierText] = useState(
    item?.modifiers ? item.modifiers.join(', ') : ''
  );
  const [initialModifierText, setInitialModifierText] = useState(modifierText);

  useEffect(() => {
    if (item) {
      const newFormData = {
        sectionId: item.sectionId,
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        priceNotes: item.priceNotes || '',
        modifiers: item.modifiers || [],
        isAvailable: item.isAvailable ?? true,
        displayOrder: item.displayOrder ?? 0,
      };
      const newModifierText = item.modifiers ? item.modifiers.join(', ') : '';
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setModifierText(newModifierText);
      setInitialModifierText(newModifierText);
    } else {
      const newFormData = {
        sectionId: sectionIdParam || '',
        name: '',
        description: '',
        price: '',
        priceNotes: '',
        modifiers: [],
        isAvailable: true,
        displayOrder: 0,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setModifierText('');
      setInitialModifierText('');
    }
  }, [item, sectionIdParam]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData) || 
                  modifierText !== initialModifierText;

  function handleCancel(e: React.MouseEvent) {
    if (isDirty) {
      e.preventDefault();
      // Reset form to initial state
      if (item) {
        const newFormData = {
          sectionId: item.sectionId,
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          priceNotes: item.priceNotes || '',
          modifiers: item.modifiers || [],
          isAvailable: item.isAvailable ?? true,
          displayOrder: item.displayOrder ?? 0,
        };
        const newModifierText = item.modifiers ? item.modifiers.join(', ') : '';
        setFormData(newFormData);
        setInitialFormData(newFormData);
        setModifierText(newModifierText);
        setInitialModifierText(newModifierText);
      } else {
        const newFormData = {
          sectionId: sectionIdParam || '',
          name: '',
          description: '',
          price: '',
          priceNotes: '',
          modifiers: [],
          isAvailable: true,
          displayOrder: 0,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
        setModifierText('');
        setInitialModifierText('');
      }
    }
    // If clean, let Link navigate normally
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const modifiers = modifierText
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      const url = item?.id ? `/api/menu-items/${item.id}` : '/api/menu-items';
      const method = item?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          modifiers,
        }),
      });

      if (res.ok) {
        showToast(item?.id ? 'Menu item updated successfully' : 'Menu item created successfully', 'success');
        router.push('/admin/menu');
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to save menu item', 'error', error.error || error.details || 'Please check your input and try again.');
      }
    } catch (error) {
      showToast('Request failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!item?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Menu item deleted successfully', 'success');
        router.push('/admin/menu');
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to delete menu item', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{item ? 'Edit Item' : 'New Item'}</h1>
          <Link
            href="/admin/menu"
            className="px-4 py-2 bg-gray-500 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 rounded text-white transition-colors"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
          <StatusToggle
            type="available"
            value={formData.isAvailable}
            onChange={(value) => setFormData({ ...formData, isAvailable: value })}
            label="Status"
          />

          <div>
            <label htmlFor="sectionId" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Section *
            </label>
            <select
              id="sectionId"
              value={formData.sectionId}
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">Select a section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Item Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Price
              </label>
              <input
                id="price"
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="$14"
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label htmlFor="displayOrder" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Display Order
              </label>
              <input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="priceNotes" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Price Notes
            </label>
            <input
              id="priceNotes"
              type="text"
              value={formData.priceNotes}
              onChange={(e) => setFormData({ ...formData, priceNotes: e.target.value })}
              placeholder="e.g., Full: $14, Half: $8"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="modifiers" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Modifiers (comma-separated)
            </label>
            <input
              id="modifiers"
              type="text"
              value={modifierText}
              onChange={(e) => setModifierText(e.target.value)}
              placeholder="e.g., Add Beef, Add Chicken, Extra Cheese"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Optional: list modifier options separated by commas</p>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {item?.id && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
              >
                Delete
              </button>
            )}
            <Link
              href="/admin/menu"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!!(loading || (item?.id && !isDirty))}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? (item?.id ? 'Saving...' : 'Creating...') : (item?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
        {item?.id && (
          <ConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete Menu Item"
            message={`Are you sure you want to delete "${item?.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
          />
        )}
      </div>
    </div>
  );
}

