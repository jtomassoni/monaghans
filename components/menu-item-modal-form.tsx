'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaTrash, FaTimes, FaCheck, FaSave } from 'react-icons/fa';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import MenuSectionModalForm from '@/components/menu-section-modal-form';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import { useFeatureFlag } from '@/lib/use-feature-flags';

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
  onSectionsChange?: (sections: MenuSection[]) => void;
}

export default function MenuItemModalForm({ 
  isOpen, 
  onClose, 
  item, 
  sections: initialSections,
  defaultSectionId,
  onSuccess,
  onDelete,
  onSectionsChange
}: MenuItemModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItemIngredients, setMenuItemIngredients] = useState<MenuItemIngredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [sections, setSections] = useState<MenuSection[]>(initialSections);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [newSectionData, setNewSectionData] = useState({ name: '', description: '' });
  const ingredientsManagementEnabled = useFeatureFlag('ingredients_management');
  
  const [formData, setFormData] = useState({
    sectionId: item?.sectionId || defaultSectionId || '',
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    isAvailable: item?.isAvailable ?? true,
    displayOrder: item?.displayOrder ?? 0,
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [initialMenuItemIngredients, setInitialMenuItemIngredients] = useState<MenuItemIngredient[]>([]);

  // Update sections when initialSections changes
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

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

  // Load sections when modal opens
  useEffect(() => {
    if (isOpen) {
      async function loadSections() {
        try {
          const res = await fetch('/api/menu-sections');
          if (res.ok) {
            const data = await res.json();
            const sectionsList = data.map((s: any) => ({ id: s.id, name: s.name }));
            setSections(sectionsList);
            onSectionsChange?.(sectionsList);
          }
        } catch (error) {
          console.error('Failed to load sections:', error);
        }
      }
      loadSections();
    }
  }, [isOpen, onSectionsChange]);

  // Load menu item ingredients when editing (only if ingredients management is enabled)
  useEffect(() => {
    async function loadMenuItemIngredients() {
      if (!ingredientsManagementEnabled) {
        setMenuItemIngredients([]);
        setInitialMenuItemIngredients([]);
        return;
      }

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
  }, [item?.id, isOpen, ingredientsManagementEnabled]);

  useEffect(() => {
    if (item) {
      const newFormData = {
        sectionId: item.sectionId,
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        isAvailable: item.isAvailable ?? true,
        displayOrder: item.displayOrder ?? 0,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const newFormData = {
        sectionId: defaultSectionId || '',
        name: '',
        description: '',
        price: '',
        isAvailable: true,
        displayOrder: 0,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setMenuItemIngredients([]);
      setInitialMenuItemIngredients([]);
    }
    // Reset new section form when modal opens/closes
    if (!isOpen) {
      setShowNewSectionForm(false);
      setNewSectionData({ name: '', description: '' });
    }
  }, [item, defaultSectionId, isOpen]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
                  (ingredientsManagementEnabled && JSON.stringify(menuItemIngredients) !== JSON.stringify(initialMenuItemIngredients));
  
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
        isAvailable: item.isAvailable ?? true,
        displayOrder: item.displayOrder ?? 0,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setMenuItemIngredients([...initialMenuItemIngredients]);
    } else {
      const newFormData = {
        sectionId: defaultSectionId || '',
        name: '',
        description: '',
        price: '',
        isAvailable: true,
        displayOrder: 0,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setMenuItemIngredients([]);
      }
    }
    // Reset new section form
    setShowNewSectionForm(false);
    setNewSectionData({ name: '', description: '' });
    // Always close the modal after resetting (if dirty) or if clean
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    // Validate section selection
    if (!showNewSectionForm && !formData.sectionId) {
      showToast('Please select a section', 'error');
      return;
    }
    
    // Validate new section data if creating a new section
    if (showNewSectionForm && !newSectionData.name.trim()) {
      showToast('Please enter a section name', 'error');
      return;
    }
    
    setLoading(true);

    try {
      let sectionId = formData.sectionId;
      
      // Create section first if new section form is open
      if (showNewSectionForm) {
        const sectionRes = await fetch('/api/menu-sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newSectionData.name.trim(),
            description: newSectionData.description.trim() || null,
            menuType: 'dinner', // Default, can be changed later
            isActive: true,
          }),
        });

        if (!sectionRes.ok) {
          const error = await sectionRes.json();
          showToast('Failed to create section', 'error', error.error || error.details || 'Please try again.');
          setLoading(false);
          return;
        }

        const newSection = await sectionRes.json();
        sectionId = newSection.id;
        
        // Update sections list
        const sectionsList = [...sections, { id: newSection.id, name: newSection.name }];
        setSections(sectionsList);
        onSectionsChange?.(sectionsList);
      }

      const url = item?.id ? `/api/menu-items/${item.id}` : '/api/menu-items';
      const method = item?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sectionId,
        }),
      });

      if (res.ok) {
        const savedItem = await res.json();
        const menuItemId = savedItem.id || item?.id;

        // Save ingredients if menu item was created/updated successfully and ingredients management is enabled
        if (ingredientsManagementEnabled && menuItemId) {
          if (menuItemIngredients.length > 0) {
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
          } else {
            // Clear ingredients if none are selected
            await fetch(`/api/menu-items/${menuItemId}/ingredients`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ingredients: [] }),
            });
          }
        }

        router.refresh();
        const successMessage = showNewSectionForm
          ? (item?.id ? 'Section and menu item updated successfully' : 'Section and menu item created successfully')
          : (item?.id ? 'Menu item updated successfully' : 'Menu item created successfully');
        showToast(successMessage, 'success');
        onSuccess?.();
        // Reset new section form
        setShowNewSectionForm(false);
        setNewSectionData({ name: '', description: '' });
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
                value={showNewSectionForm ? 'new-section' : formData.sectionId}
                onChange={(e) => {
                  if (e.target.value === 'new-section') {
                    setShowNewSectionForm(true);
                  } else {
                    setFormData({ ...formData, sectionId: e.target.value });
                    setShowNewSectionForm(false);
                  }
                }}
                required={!showNewSectionForm}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                <option value="">Select a section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
                <option value="new-section" className="text-blue-600 dark:text-blue-400 font-medium">
                  + New Section
                </option>
              </select>
              {showNewSectionForm && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="newSectionName" className="text-xs font-medium text-gray-900 dark:text-white">
                      Section Name *
                    </label>
                    <input
                      id="newSectionName"
                      type="text"
                      value={newSectionData.name}
                      onChange={(e) => setNewSectionData({ ...newSectionData, name: e.target.value })}
                      placeholder="e.g., Appetizers, Entrees"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="newSectionDescription" className="text-xs font-medium text-gray-900 dark:text-white">
                      Description
                    </label>
                    <textarea
                      id="newSectionDescription"
                      value={newSectionData.description}
                      onChange={(e) => setNewSectionData({ ...newSectionData, description: e.target.value })}
                      placeholder="Optional description"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewSectionForm(false);
                      setNewSectionData({ name: '', description: '' });
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                  >
                    <FaTimes className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
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
              Set the price for this menu item.
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
        </div>

        {ingredientsManagementEnabled && (
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
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          {item?.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <FaTrash className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
          >
            <FaTimes className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={!!(loading || (item?.id && !isDirty))}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{item?.id ? 'Saving...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                {item?.id ? <FaSave className="w-3.5 h-3.5" /> : <FaCheck className="w-3.5 h-3.5" />}
                <span>{item?.id ? 'Save' : 'Create'}</span>
              </>
            )}
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
      <MenuSectionModalForm
        isOpen={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        onSuccess={async () => {
          // Track current section IDs before reloading
          const currentSectionIds = new Set(sections.map(s => s.id));
          
          // Reload sections after creating a new one
          try {
            const res = await fetch('/api/menu-sections');
            if (res.ok) {
              const data = await res.json();
              const sectionsList = data.map((s: any) => ({ id: s.id, name: s.name }));
              setSections(sectionsList);
              onSectionsChange?.(sectionsList);
              
              // Find the newly created section (one that wasn't in the previous list)
              const newSection = sectionsList.find((s: MenuSection) => !currentSectionIds.has(s.id));
              if (newSection) {
                setFormData({ ...formData, sectionId: newSection.id });
                showToast('Section created and selected', 'success');
              }
            }
          } catch (error) {
            console.error('Failed to reload sections:', error);
          }
        }}
      />
    </Modal>
  );
}

