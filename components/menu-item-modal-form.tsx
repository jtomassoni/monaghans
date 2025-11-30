'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

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
  prepTimeMin?: number | null;
}

interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  costPerUnit: number;
  isActive: boolean;
}

interface MenuItemIngredient {
  ingredientId: string;
  quantity: number;
  notes?: string;
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
  onDelete?: (itemId: string) => void;
}

export default function MenuItemModalForm({ 
  isOpen, 
  onClose, 
  item, 
  sections,
  defaultSectionId,
  onSuccess,
  onDelete
}: MenuItemModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItemIngredients, setMenuItemIngredients] = useState<MenuItemIngredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  
  const [formData, setFormData] = useState({
    sectionId: item?.sectionId || defaultSectionId || '',
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    priceNotes: item?.priceNotes || '',
    modifiers: item?.modifiers || [],
    isAvailable: item?.isAvailable ?? true,
    displayOrder: item?.displayOrder ?? 0,
    prepTimeMin: item?.prepTimeMin?.toString() || '',
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [modifierText, setModifierText] = useState(
    item?.modifiers ? item.modifiers.join(', ') : ''
  );
  const [initialModifierText, setInitialModifierText] = useState(modifierText);
  const [initialMenuItemIngredients, setInitialMenuItemIngredients] = useState<MenuItemIngredient[]>([]);

  // Load available ingredients
  useEffect(() => {
    async function loadIngredients() {
      try {
        const res = await fetch('/api/ingredients?active=true');
        if (res.ok) {
          const data = await res.json();
          setIngredients(data);
        }
      } catch (error) {
        console.error('Failed to load ingredients:', error);
      }
    }
    loadIngredients();
  }, []);

  // Load menu item ingredients when editing
  useEffect(() => {
    async function loadMenuItemIngredients() {
      if (!item?.id) {
        setMenuItemIngredients([]);
        setInitialMenuItemIngredients([]);
        return;
      }

      setLoadingIngredients(true);
      try {
        const res = await fetch(`/api/menu-items/${item.id}/ingredients`);
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((mi: any) => ({
            ingredientId: mi.ingredientId,
            quantity: mi.quantity,
            notes: mi.notes || '',
          }));
          setMenuItemIngredients(mapped);
          setInitialMenuItemIngredients(mapped);
        }
      } catch (error) {
        console.error('Failed to load menu item ingredients:', error);
      } finally {
        setLoadingIngredients(false);
      }
    }
    loadMenuItemIngredients();
  }, [item?.id, isOpen]);

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
        prepTimeMin: item.prepTimeMin?.toString() || '',
      };
      const newModifierText = item.modifiers ? item.modifiers.join(', ') : '';
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setModifierText(newModifierText);
      setInitialModifierText(newModifierText);
    } else {
      const newFormData = {
        sectionId: defaultSectionId || '',
        name: '',
        description: '',
        price: '',
        priceNotes: '',
        modifiers: [],
        isAvailable: true,
        displayOrder: 0,
        prepTimeMin: '',
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setModifierText('');
      setInitialModifierText('');
      setMenuItemIngredients([]);
      setInitialMenuItemIngredients([]);
    }
  }, [item, defaultSectionId, isOpen]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData) || 
                  modifierText !== initialModifierText ||
                  JSON.stringify(menuItemIngredients) !== JSON.stringify(initialMenuItemIngredients);
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty && isOpen);

  function handleCancel() {
    if (isDirty) {
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
          prepTimeMin: item.prepTimeMin?.toString() || '',
        };
        const newModifierText = item.modifiers ? item.modifiers.join(', ') : '';
        setFormData(newFormData);
        setInitialFormData(newFormData);
        setModifierText(newModifierText);
        setInitialModifierText(newModifierText);
        setMenuItemIngredients([...initialMenuItemIngredients]);
      } else {
        const newFormData = {
          sectionId: defaultSectionId || '',
          name: '',
          description: '',
          price: '',
          priceNotes: '',
          modifiers: [],
          isAvailable: true,
          displayOrder: 0,
          prepTimeMin: '',
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
        setModifierText('');
        setInitialModifierText('');
        setMenuItemIngredients([]);
      }
    }
    // Always close the modal after resetting (if dirty) or if clean
    onClose();
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
          prepTimeMin: formData.prepTimeMin ? parseInt(formData.prepTimeMin) : null,
        }),
      });

      if (res.ok) {
        const savedItem = await res.json();
        const menuItemId = savedItem.id || item?.id;

        // Save ingredients if menu item was created/updated successfully
        if (menuItemId && menuItemIngredients.length > 0) {
          const ingredientsRes = await fetch(`/api/menu-items/${menuItemId}/ingredients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredients: menuItemIngredients.map(ing => ({
                ingredientId: ing.ingredientId,
                quantity: parseFloat(ing.quantity.toString()),
                notes: ing.notes || null,
              })),
            }),
          });

          if (!ingredientsRes.ok) {
            console.error('Failed to save ingredients');
          }
        } else if (menuItemId && menuItemIngredients.length === 0) {
          // Clear ingredients if none are selected
          await fetch(`/api/menu-items/${menuItemId}/ingredients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: [] }),
          });
        }

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

  function addIngredient() {
    setMenuItemIngredients([
      ...menuItemIngredients,
      { ingredientId: '', quantity: 1, notes: '' },
    ]);
  }

  function removeIngredient(index: number) {
    setMenuItemIngredients(menuItemIngredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof MenuItemIngredient, value: string | number) {
    const updated = [...menuItemIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItemIngredients(updated);
  }

  async function handleDelete() {
    if (!item?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Menu item deleted successfully', 'success');
        onDelete?.(item.id);
        onSuccess?.();
        onClose();
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
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={item ? 'Edit Menu Item' : 'New Menu Item'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Item Status</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
                Control whether this menu item is available for ordering.
              </p>
            </div>
            <StatusToggle
              type="available"
              value={formData.isAvailable}
              onChange={(value) => setFormData({ ...formData, isAvailable: value })}
              className="shrink-0"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="sectionId" className="text-sm font-medium text-gray-900 dark:text-white">
                Section *
              </label>
              <select
                id="sectionId"
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                required
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                <option value="">Select a section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                Item Name *
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

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Pricing</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
              Set the price and display order for this menu item.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium text-gray-900 dark:text-white">
              Price
            </label>
            <input
              id="price"
              type="text"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="$14"
              className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="priceNotes" className="text-sm font-medium text-gray-900 dark:text-white">
              Price Notes
            </label>
            <input
              id="priceNotes"
              type="text"
              value={formData.priceNotes}
              onChange={(e) => setFormData({ ...formData, priceNotes: e.target.value })}
              placeholder="e.g., Full: $14, Half: $8"
              className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="modifiers" className="text-sm font-medium text-gray-900 dark:text-white">
              Modifiers (comma-separated)
            </label>
            <input
              id="modifiers"
              type="text"
              value={modifierText}
              onChange={(e) => setModifierText(e.target.value)}
              placeholder="e.g., Add Beef, Add Chicken, Extra Cheese"
              className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Optional: list modifier options separated by commas</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="prepTimeMin" className="text-sm font-medium text-gray-900 dark:text-white">
              Prep Time (minutes)
            </label>
            <input
              id="prepTimeMin"
              type="number"
              min="0"
              value={formData.prepTimeMin}
              onChange={(e) => setFormData({ ...formData, prepTimeMin: e.target.value })}
              placeholder="e.g., 15"
              className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Optional: estimated prep/cook time in minutes</p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Ingredients</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
              Link ingredients to this menu item with quantities for cost tracking.
            </p>
          </div>

          {loadingIngredients ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Loading ingredients...
            </div>
          ) : (
            <div className="space-y-4">
              {menuItemIngredients.map((miIng, index) => {
                const ingredient = ingredients.find(ing => ing.id === miIng.ingredientId);
                return (
                  <div key={index} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-5 space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Ingredient</label>
                        <select
                          value={miIng.ingredientId}
                          onChange={(e) => updateIngredient(index, 'ingredientId', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        >
                          <option value="">Select ingredient</option>
                          {ingredients
                            .filter(ing => ing.isActive)
                            .map(ing => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({ing.unit})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="col-span-3 space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={miIng.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                          placeholder="0"
                        />
                        {ingredient && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{ingredient.unit}</p>
                        )}
                      </div>
                      <div className="col-span-3 space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Notes</label>
                        <input
                          type="text"
                          value={miIng.notes || ''}
                          onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="col-span-1 flex items-end pb-2">
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addIngredient}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <FaPlus className="w-4 h-4" />
                <span>Add Ingredient</span>
              </button>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm flex flex-wrap items-center justify-end gap-3 sticky bottom-0 -mx-6 px-6 bg-white dark:bg-gray-800">
          {item?.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer"
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
            disabled={!!(loading || (item?.id && !isDirty))}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            {loading ? (item?.id ? 'Saving...' : 'Creating...') : (item?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
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
    </Modal>
  );
}

