'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import StatusToggle from '@/components/status-toggle';
import { showToast } from '@/components/toast';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  costPerUnit: number;
  supplier: string | null;
  parLevel: number | null;
  currentStock: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface IngredientsListProps {
  initialIngredients: Ingredient[];
}

const CATEGORIES = ['Dairy', 'Grains', 'Vegetables', 'Proteins', 'Condiments', 'Other'];
const UNITS = ['oz', 'lb', 'count', 'cup', 'tsp', 'tbsp', 'g', 'kg', 'ml', 'l'];

export default function IngredientsList({ initialIngredients }: IngredientsListProps) {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>(initialIngredients);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    setIngredients(initialIngredients);
    setFilteredIngredients(initialIngredients);
  }, [initialIngredients]);

  // Filter ingredients based on showInactive toggle
  useEffect(() => {
    const filtered = showInactive 
      ? ingredients 
      : ingredients.filter(ing => ing.isActive);
    setFilteredIngredients(filtered);
  }, [ingredients, showInactive]);

  const sortOptions: SortOption<Ingredient>[] = [
    { label: 'Name (A-Z)', value: 'name' },
    { label: 'Name (Z-A)', value: 'name', sortFn: (a, b) => b.name.localeCompare(a.name) },
    { label: 'Category (A-Z)', value: 'category' },
    { label: 'Cost (Low to High)', value: 'costPerUnit' },
    { label: 'Cost (High to Low)', value: 'costPerUnit', sortFn: (a, b) => b.costPerUnit - a.costPerUnit },
  ];

  const filterOptions: FilterOption<Ingredient>[] = [
    { label: 'All Ingredients', value: 'all', filterFn: () => true },
    { label: 'Active Only', value: 'active', filterFn: (i) => i.isActive },
    { label: 'Inactive Only', value: 'inactive', filterFn: (i) => !i.isActive },
    ...CATEGORIES.map(cat => ({
      label: cat,
      value: cat.toLowerCase(),
      filterFn: (i: Ingredient) => i.category === cat,
    })),
  ];

  const [formData, setFormData] = useState({
    name: '',
    category: 'Other',
    unit: 'oz',
    costPerUnit: '',
    supplier: '',
    parLevel: '',
    currentStock: '',
    notes: '',
    isActive: true,
  });

  const handleNew = () => {
    setEditingIngredient(null);
    setFormData({
      name: '',
      category: 'Other',
      unit: 'oz',
      costPerUnit: '',
      supplier: '',
      parLevel: '',
      currentStock: '',
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      costPerUnit: ingredient.costPerUnit.toString(),
      supplier: ingredient.supplier || '',
      parLevel: ingredient.parLevel?.toString() || '',
      currentStock: ingredient.currentStock?.toString() || '',
      notes: ingredient.notes || '',
      isActive: ingredient.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingIngredient 
        ? `/api/ingredients/${editingIngredient.id}` 
        : '/api/ingredients';
      const method = editingIngredient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costPerUnit: parseFloat(formData.costPerUnit) || 0,
          parLevel: formData.parLevel ? parseFloat(formData.parLevel) : null,
          currentStock: formData.currentStock ? parseFloat(formData.currentStock) : null,
          supplier: formData.supplier || null,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        router.refresh();
        showToast(
          editingIngredient ? 'Ingredient updated successfully' : 'Ingredient created successfully',
          'success'
        );
        setIsModalOpen(false);
      } else {
        const error = await res.json();
        showToast(
          editingIngredient ? 'Failed to update ingredient' : 'Failed to create ingredient',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the ingredient.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/ingredients/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
        showToast('Ingredient deleted successfully', 'success');
        setDeleteConfirmation(null);
      } else {
        const error = await res.json();
        showToast('Failed to delete ingredient', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const groupedIngredients = filteredIngredients.reduce((acc, ing) => {
    if (!acc[ing.category]) {
      acc[ing.category] = [];
    }
    acc[ing.category].push(ing);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Ingredients</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredIngredients.length} ingredient{filteredIngredients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Show inactive</span>
          </label>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>New Ingredient</span>
          </button>
        </div>
      </div>

      {/* Search, Sort, Filter */}
      <SearchSortFilter
        items={filteredIngredients}
        onFilteredItemsChange={setFilteredIngredients}
        sortOptions={sortOptions}
        filterOptions={filterOptions}
        searchPlaceholder="Search ingredients..."
        searchFields={['name', 'category', 'supplier']}
      />

      {/* Ingredients List */}
      <div className="space-y-6">
        {Object.keys(groupedIngredients).length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No ingredients found</p>
            <p className="text-sm mt-1">Create your first ingredient to get started</p>
          </div>
        ) : (
          Object.entries(groupedIngredients).map(([category, items]) => (
            <div key={category} className="bg-white/90 dark:bg-gray-900/40 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {ingredient.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ${ingredient.costPerUnit.toFixed(2)}/{ingredient.unit}
                        </p>
                      </div>
                      <StatusToggle
                        type="available"
                        value={ingredient.isActive}
                        onChange={async (value) => {
                          try {
                            const res = await fetch(`/api/ingredients/${ingredient.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ...ingredient, isActive: value }),
                            });
                            if (res.ok) {
                              router.refresh();
                              showToast('Ingredient updated', 'success');
                            }
                          } catch (error) {
                            showToast('Failed to update ingredient', 'error');
                          }
                        }}
                        className="shrink-0"
                      />
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {ingredient.supplier && (
                        <p>Supplier: {ingredient.supplier}</p>
                      )}
                      {ingredient.parLevel !== null && (
                        <p>Par Level: {ingredient.parLevel} {ingredient.unit}</p>
                      )}
                      {ingredient.currentStock !== null && (
                        <p className={ingredient.currentStock < (ingredient.parLevel || 0) ? 'text-red-600 dark:text-red-400' : ''}>
                          Stock: {ingredient.currentStock} {ingredient.unit}
                        </p>
                      )}
                    </div>
                    {ingredient.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                        {ingredient.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handleEdit(ingredient)}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <FaEdit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation(ingredient)}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <FaTrash className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="e.g., Mozzarella Cheese"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium text-gray-900 dark:text-white">
                  Category *
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="unit" className="text-sm font-medium text-gray-900 dark:text-white">
                  Unit *
                </label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="costPerUnit" className="text-sm font-medium text-gray-900 dark:text-white">
                Cost Per Unit ($) *
              </label>
              <input
                id="costPerUnit"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                required
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="supplier" className="text-sm font-medium text-gray-900 dark:text-white">
                Supplier
              </label>
              <input
                id="supplier"
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="e.g., Sysco, US Foods"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="parLevel" className="text-sm font-medium text-gray-900 dark:text-white">
                  Par Level
                </label>
                <input
                  id="parLevel"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.parLevel}
                  onChange={(e) => setFormData({ ...formData, parLevel: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="currentStock" className="text-sm font-medium text-gray-900 dark:text-white">
                  Current Stock
                </label>
                <input
                  id="currentStock"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium text-gray-900 dark:text-white">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="Additional notes about this ingredient..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Status</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Control whether this ingredient is active
                </p>
              </div>
              <StatusToggle
                type="available"
                value={formData.isActive}
                onChange={(value) => setFormData({ ...formData, isActive: value })}
                className="shrink-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              {loading ? (editingIngredient ? 'Saving...' : 'Creating...') : (editingIngredient ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleDelete}
        title="Delete Ingredient"
        message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone and will remove this ingredient from all menu items.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

