'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import ConfirmationDialog from '@/components/confirmation-dialog';
import MenuItemModalForm from '@/components/menu-item-modal-form';
import StatusBadge from '@/components/status-badge';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash } from 'react-icons/fa';

interface MenuItemWithSection {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  price: string | null;
  priceNotes: string | null;
  modifiers: string | null;
  isAvailable: boolean;
  displayOrder: number;
  section: {
    id: string;
    name: string;
    menuType: string;
  };
}

interface MenuItemsListProps {
  initialItems: MenuItemWithSection[];
  sections: Array<{ id: string; name: string }>;
}

type SortField = 'name' | 'section' | 'price' | 'isAvailable';
type SortDirection = 'asc' | 'desc' | null;

export default function MenuItemsList({ initialItems, sections }: MenuItemsListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filteredItems, setFilteredItems] = useState<MenuItemWithSection[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
  const [columnSort, setColumnSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'name', direction: 'asc' });

  useEffect(() => {
    setItems(initialItems);
    setFilteredItems(initialItems);
  }, [initialItems]);

  const sortOptions: SortOption<MenuItemWithSection>[] = [
    { label: 'Name (A-Z)', value: 'name' },
    { label: 'Name (Z-A)', value: 'name', sortFn: (a, b) => b.name.localeCompare(a.name) },
    { label: 'Section (A-Z)', value: 'section', sortFn: (a, b) => a.section.name.localeCompare(b.section.name) },
    { label: 'Section (Z-A)', value: 'section', sortFn: (a, b) => b.section.name.localeCompare(a.section.name) },
    { label: 'Price (Low to High)', value: 'price', sortFn: (a, b) => {
      const aPrice = a.price ? parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0 : 999999;
      const bPrice = b.price ? parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0 : 999999;
      return aPrice - bPrice;
    }},
    { label: 'Price (High to Low)', value: 'price', sortFn: (a, b) => {
      const aPrice = a.price ? parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0 : 0;
      const bPrice = b.price ? parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0 : 0;
      return bPrice - aPrice;
    }},
  ];

  const filterOptions: FilterOption<MenuItemWithSection>[] = [
    { label: 'Available Only', value: 'available', filterFn: (item) => item.isAvailable },
    { label: 'Unavailable Only', value: 'unavailable', filterFn: (item) => !item.isAvailable },
    ...sections.map(section => ({
      label: section.name,
      value: section.id,
      filterFn: (item: MenuItemWithSection) => item.sectionId === section.id,
    })),
  ];

  async function handleItemClick(item: MenuItemWithSection) {
    try {
      const res = await fetch(`/api/menu-items/${item.id}`);
      if (res.ok) {
        const fullItem = await res.json();
        const modifiers = fullItem.modifiers ? JSON.parse(fullItem.modifiers) : [];
        setEditingItem({
          id: fullItem.id,
          sectionId: fullItem.sectionId,
          name: fullItem.name,
          description: fullItem.description || '',
          price: fullItem.price || '',
          priceNotes: fullItem.priceNotes || '',
          modifiers: Array.isArray(modifiers) ? modifiers : [],
          isAvailable: fullItem.isAvailable,
          displayOrder: fullItem.displayOrder,
        });
        setItemModalOpen(true);
      }
    } catch (error) {
      showToast('Failed to load menu item', 'error', error instanceof Error ? error.message : 'An error occurred');
    }
  }

  function handleDelete(item: MenuItemWithSection) {
    setDeleteConfirmation({ id: item.id, name: item.name });
  }

  async function confirmDelete() {
    if (!deleteConfirmation) return;

    try {
      const res = await fetch(`/api/menu-items/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Fetch updated items immediately
        try {
          const refreshRes = await fetch('/api/menu-items');
          if (refreshRes.ok) {
            const updatedItems = await refreshRes.json();
            setItems(updatedItems);
          } else {
            // Fallback to local update
            const updatedItems = items.filter((i) => i.id !== deleteConfirmation.id);
            setItems(updatedItems);
          }
        } catch (error) {
          // Fallback to local update
          const updatedItems = items.filter((i) => i.id !== deleteConfirmation.id);
          setItems(updatedItems);
        }
        router.refresh();
        showToast('Menu item deleted successfully', 'success');
      } else {
        showToast('Failed to delete menu item', 'error');
      }
    } catch (error) {
      showToast('Failed to delete menu item', 'error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setDeleteConfirmation(null);
    }
  }

  async function handleModalSuccess() {
    // Fetch updated items immediately
    try {
      const res = await fetch('/api/menu-items');
      if (res.ok) {
        const updatedItems = await res.json();
        setItems(updatedItems);
      }
    } catch (error) {
      console.error('Failed to refresh items:', error);
    }
    router.refresh();
  }

  async function handleItemDeleted(itemId: string) {
    // Fetch updated items immediately
    try {
      const res = await fetch('/api/menu-items');
      if (res.ok) {
        const updatedItems = await res.json();
        setItems(updatedItems);
      }
    } catch (error) {
      console.error('Failed to refresh items:', error);
      // Fallback to local update
      const updatedItems = items.filter((i) => i.id !== itemId);
      setItems(updatedItems);
    }
    router.refresh();
    setItemModalOpen(false);
    setEditingItem(null);
  }

  const handleColumnSort = (field: SortField) => {
    setColumnSort((prev) => {
      if (prev.field === field) {
        // Cycle through: asc -> desc -> null -> asc
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field, direction: null };
        return { field, direction: 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  // Apply column sorting to filtered items
  const displayItems = useMemo(() => {
    if (!columnSort.direction) return filteredItems;
    
    const sorted = [...filteredItems].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (columnSort.field) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'section':
          aVal = a.section?.name?.toLowerCase() || '';
          bVal = b.section?.name?.toLowerCase() || '';
          break;
        case 'price':
          aVal = a.price ? parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0 : 999999;
          bVal = b.price ? parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0 : 999999;
          break;
        case 'isAvailable':
          aVal = a.isAvailable ? 1 : 0;
          bVal = b.isAvailable ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return columnSort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return columnSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredItems, columnSort]);

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 pb-3">
        <SearchSortFilter
          items={items}
          onFilteredItemsChange={setFilteredItems}
          searchFields={['name', 'description', 'price']}
          searchPlaceholder="Search menu items..."
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          defaultSort={sortOptions[0]}
          actionButton={
            <button
              onClick={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center gap-2 cursor-pointer whitespace-nowrap border border-blue-400 dark:border-blue-500"
            >
              <span>➕</span>
              <span>New Item</span>
            </button>
          }
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {displayItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center shadow-md">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length === 0 
                ? 'No menu items yet. Create your first one!'
                : 'No items match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full border-collapse bg-white dark:bg-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Name</span>
                      {columnSort.field === 'name' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('section')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Section</span>
                      {columnSort.field === 'section' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Description
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('price')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Price</span>
                      {columnSort.field === 'price' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Price Notes
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('isAvailable')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      {columnSort.field === 'isAvailable' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => handleItemClick(item)}
                      >
                        {item.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.section.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-xs">
                        {item.description || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {item.price || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.priceNotes || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {!item.isAvailable && (
                        <StatusBadge status="unavailable" />
                      )}
                      {item.isAvailable && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleItemClick(item)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={confirmDelete}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Menu Item Modal */}
      <MenuItemModalForm
        isOpen={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        sections={sections}
        onSuccess={handleModalSuccess}
        onDelete={handleItemDeleted}
      />
    </div>
  );
}

