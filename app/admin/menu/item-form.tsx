'use client';

import { useState, FormEvent, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaPlus, FaTrash } from 'react-icons/fa';
import StatusToggle from '@/components/status-toggle';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import {
  calculateFoodCost,
  calculateFoodCostPercentage,
  formatFoodCostPercentage,
  formatCurrency,
  getFoodCostStatus,
  parsePrice,
} from '@/lib/food-cost-helpers';
import {
  calculateLaborCostPerItem,
  calculateAverageHourlyWage,
  calculateLaborCostPercentage,
  formatLaborCostPercentage,
  getLaborCostStatus,
} from '@/lib/labor-cost-helpers';

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
  id: string;
  quantity: number;
  notes: string | null;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    costPerUnit: number;
  };
}

interface MenuItemIngredientForm {
  ingredientId: string;
  quantity: number;
  notes: string;
}

export default function MenuItemForm({ item, sections, ingredients = [] }: { item?: MenuItem; sections: any[]; ingredients?: MenuItemIngredient[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionIdParam = searchParams.get('sectionId');
  
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [menuItemIngredients, setMenuItemIngredients] = useState<MenuItemIngredientForm[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [averageHourlyWage, setAverageHourlyWage] = useState<number>(0);
  const [formData, setFormData] = useState({
    sectionId: item?.sectionId || sectionIdParam || '',
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
  const [initialMenuItemIngredients, setInitialMenuItemIngredients] = useState<MenuItemIngredientForm[]>([]);

  // Load available ingredients
  useEffect(() => {
    async function loadIngredients() {
      try {
        const res = await fetch('/api/ingredients?active=true');
        if (res.ok) {
          const data = await res.json();
          setAvailableIngredients(data);
        }
      } catch (error) {
        console.error('Failed to load ingredients:', error);
      }
    }
    loadIngredients();
  }, []);

  // Load employees to calculate average hourly wage
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch('/api/employees?active=true');
        if (res.ok) {
          const data = await res.json();
          const avgWage = calculateAverageHourlyWage(data.map((emp: any) => ({ hourlyWage: emp.hourlyWage })));
          setAverageHourlyWage(avgWage);
        }
      } catch (error) {
        console.error('Failed to load employees:', error);
      }
    }
    loadEmployees();
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
          const mapped = data.map((mi: MenuItemIngredient) => ({
            ingredientId: mi.ingredient.id,
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
  }, [item?.id]);

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
        sectionId: sectionIdParam || '',
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
  }, [item, sectionIdParam]);

  function addIngredient() {
    setMenuItemIngredients([
      ...menuItemIngredients,
      { ingredientId: '', quantity: 1, notes: '' },
    ]);
  }

  function removeIngredient(index: number) {
    setMenuItemIngredients(menuItemIngredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof MenuItemIngredientForm, value: string | number) {
    const updated = [...menuItemIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItemIngredients(updated);
  }

  // Calculate food cost and percentage
  const foodCostData = useMemo(() => {
    const validIngredients = menuItemIngredients
      .filter(ing => ing.ingredientId)
      .map(ing => {
        const ingredient = availableIngredients.find(a => a.id === ing.ingredientId);
        if (!ingredient) return null;
        return {
          quantity: ing.quantity,
          ingredient: {
            costPerUnit: ingredient.costPerUnit,
          },
        };
      })
      .filter((ing): ing is { quantity: number; ingredient: { costPerUnit: number } } => ing !== null);

    const foodCost = calculateFoodCost(validIngredients);
    const foodCostPercentage = calculateFoodCostPercentage(foodCost, formData.price);
    const status = getFoodCostStatus(foodCostPercentage);

    return { foodCost, foodCostPercentage, status };
  }, [menuItemIngredients, availableIngredients, formData.price]);

  // Calculate labor cost and percentage
  const laborCostData = useMemo(() => {
    const prepTimeMin = formData.prepTimeMin ? parseInt(formData.prepTimeMin) : null;
    const laborCost = calculateLaborCostPerItem(prepTimeMin, averageHourlyWage);
    const menuPrice = parsePrice(formData.price);
    const laborCostPercentage = menuPrice && laborCost
      ? calculateLaborCostPercentage(laborCost, menuPrice)
      : null;
    const status = getLaborCostStatus(laborCostPercentage);

    return { laborCost: laborCost || 0, laborCostPercentage, status };
  }, [formData.prepTimeMin, formData.price, averageHourlyWage]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData) || 
                  modifierText !== initialModifierText ||
                  JSON.stringify(menuItemIngredients) !== JSON.stringify(initialMenuItemIngredients);
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty);

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
          sectionId: sectionIdParam || '',
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
          prepTimeMin: formData.prepTimeMin ? parseInt(formData.prepTimeMin) : null,
        }),
      });

      if (res.ok) {
        const savedItem = await res.json();
        const menuItemId = savedItem.id || item?.id;

        // Save ingredients if menu item was created/updated successfully
        if (menuItemId) {
          const ingredientsRes = await fetch(`/api/menu-items/${menuItemId}/ingredients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredients: menuItemIngredients
                .filter(ing => ing.ingredientId) // Only include ingredients with valid IDs
                .map(ing => ({
                  ingredientId: ing.ingredientId,
                  quantity: parseFloat(ing.quantity.toString()),
                  notes: ing.notes || null,
                })),
            }),
          });

          if (!ingredientsRes.ok) {
            console.error('Failed to save ingredients');
            showToast('Menu item saved but failed to update ingredients', 'error');
          }
        }

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

          <div>
            <label htmlFor="prepTimeMin" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Prep Time (minutes)
            </label>
            <input
              id="prepTimeMin"
              type="number"
              min="0"
              value={formData.prepTimeMin}
              onChange={(e) => setFormData({ ...formData, prepTimeMin: e.target.value })}
              placeholder="e.g., 15"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Optional: estimated prep/cook time in minutes</p>
          </div>

          {/* Ingredients Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Ingredients</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  const ingredient = availableIngredients.find(ing => ing.id === miIng.ingredientId);
                  return (
                    <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-5 space-y-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Ingredient</label>
                          <select
                            value={miIng.ingredientId}
                            onChange={(e) => updateIngredient(index, 'ingredientId', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select ingredient</option>
                            {availableIngredients
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
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      {ingredient && miIng.quantity > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Cost: ${(ingredient.costPerUnit * miIng.quantity).toFixed(2)}
                        </p>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addIngredient}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  <span>Add Ingredient</span>
                </button>

                {menuItemIngredients.length > 0 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Total Food Cost:
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(foodCostData.foodCost)}
                      </p>
                    </div>
                    {formData.price && foodCostData.foodCostPercentage !== null && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Food Cost Percentage:
                        </p>
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-semibold ${
                              foodCostData.status === 'good'
                                ? 'text-green-600 dark:text-green-400'
                                : foodCostData.status === 'acceptable'
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : foodCostData.status === 'high'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {formatFoodCostPercentage(foodCostData.foodCostPercentage)}
                          </p>
                          {foodCostData.status !== 'unknown' && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                foodCostData.status === 'good'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : foodCostData.status === 'acceptable'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {foodCostData.status === 'good'
                                ? 'Good'
                                : foodCostData.status === 'acceptable'
                                ? 'Acceptable'
                                : 'High'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {formData.price && parsePrice(formData.price) && (
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Menu Price:</span>
                        <span>{formatCurrency(parsePrice(formData.price) || 0)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Labor Cost Display */}
            {formData.prepTimeMin && parseInt(formData.prepTimeMin) > 0 && averageHourlyWage > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Labor Cost</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Labor Cost:
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(laborCostData.laborCost)}
                  </p>
                </div>
                {formData.price && laborCostData.laborCostPercentage !== null && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Labor Cost Percentage:
                    </p>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          laborCostData.status === 'good'
                            ? 'text-green-600 dark:text-green-400'
                            : laborCostData.status === 'acceptable'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : laborCostData.status === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {formatLaborCostPercentage(laborCostData.laborCostPercentage)}
                      </p>
                      {laborCostData.status !== 'unknown' && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            laborCostData.status === 'good'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : laborCostData.status === 'acceptable'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {laborCostData.status === 'good'
                            ? 'Good'
                            : laborCostData.status === 'acceptable'
                            ? 'Acceptable'
                            : 'High'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Prep Time:</span>
                  <span>{formData.prepTimeMin} minutes</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Avg Hourly Wage:</span>
                  <span>{formatCurrency(averageHourlyWage)}/hr</span>
                </div>
              </div>
            )}
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

