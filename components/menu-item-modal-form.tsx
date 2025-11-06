'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';

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

interface MenuSection {
  id: string;
  name: string;
}

interface MenuItemModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  item?: MenuItem;
  sections: MenuSection[];
  defaultSectionId?: string;
  onSuccess?: () => void;
}

export default function MenuItemModalForm({ 
  isOpen, 
  onClose, 
  item, 
  sections,
  defaultSectionId,
  onSuccess 
}: MenuItemModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    sectionId: item?.sectionId || defaultSectionId || '',
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    priceNotes: item?.priceNotes || '',
    modifiers: item?.modifiers || [],
    isAvailable: item?.isAvailable ?? true,
    displayOrder: item?.displayOrder ?? 0,
  });

  const [modifierText, setModifierText] = useState(
    item?.modifiers ? item.modifiers.join(', ') : ''
  );

  useEffect(() => {
    if (item) {
      setFormData({
        sectionId: item.sectionId,
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        priceNotes: item.priceNotes || '',
        modifiers: item.modifiers || [],
        isAvailable: item.isAvailable ?? true,
        displayOrder: item.displayOrder ?? 0,
      });
      setModifierText(item.modifiers ? item.modifiers.join(', ') : '');
    } else {
      setFormData({
        sectionId: defaultSectionId || '',
        name: '',
        description: '',
        price: '',
        priceNotes: '',
        modifiers: [],
        isAvailable: true,
        displayOrder: 0,
      });
      setModifierText('');
    }
  }, [item, defaultSectionId, isOpen]);

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
        router.refresh();
        showToast(
          item?.id ? 'Menu item updated successfully' : 'Menu item created successfully',
          'success'
        );
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          item?.id ? 'Failed to update menu item' : 'Failed to create menu item',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the menu item.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? 'Edit Menu Item' : 'New Menu Item'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="sectionId" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Section *
          </label>
          <select
            id="sectionId"
            value={formData.sectionId}
            onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
            required
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Item Name *
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="price" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
              Price
            </label>
            <input
              id="price"
              type="text"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="$14"
              className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
          <div>
            <label htmlFor="displayOrder" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
              Display Order
            </label>
            <input
              id="displayOrder"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="priceNotes" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Price Notes
          </label>
          <input
            id="priceNotes"
            type="text"
            value={formData.priceNotes}
            onChange={(e) => setFormData({ ...formData, priceNotes: e.target.value })}
            placeholder="e.g., Full: $14, Half: $8"
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label htmlFor="modifiers" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Modifiers (comma-separated)
          </label>
          <input
            id="modifiers"
            type="text"
            value={modifierText}
            onChange={(e) => setModifierText(e.target.value)}
            placeholder="e.g., Add Beef, Add Chicken, Extra Cheese"
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional: list modifier options separated by commas</p>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
            <input
              type="checkbox"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm">Available</span>
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
            {loading ? (item?.id ? 'Saving...' : 'Creating...') : (item?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

