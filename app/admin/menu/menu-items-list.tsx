'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import ConfirmationDialog from '@/components/confirmation-dialog';
import MenuItemModalForm from '@/components/menu-item-modal-form';
import StatusBadge from '@/components/status-badge';

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

export default function MenuItemsList({ initialItems, sections }: MenuItemsListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filteredItems, setFilteredItems] = useState<MenuItemWithSection[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

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
        const updatedItems = items.filter((i) => i.id !== deleteConfirmation.id);
        setItems(updatedItems);
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

  function handleModalSuccess() {
    router.refresh();
  }

  function handleItemDeleted(itemId: string) {
    const updatedItems = items.filter((i) => i.id !== itemId);
    setItems(updatedItems);
    setItemModalOpen(false);
    setEditingItem(null);
  }

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
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center shadow-md">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length === 0 
                ? 'No menu items yet. Create your first one!'
                : 'No items match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group/item relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 p-5 max-w-2xl flex justify-between items-start gap-4"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.section.name}
                    </span>
                    {!item.isAvailable && (
                      <StatusBadge status="unavailable" />
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    {item.price && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Price: {item.price}</span>
                    )}
                    {item.priceNotes && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">• {item.priceNotes}</span>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 z-30 relative">
                  {/* Edit button - appears on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                    className="opacity-0 group-hover/item:opacity-100 px-4 py-2 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 border border-blue-400 dark:border-blue-500 cursor-pointer"
                    title="Edit menu item"
                  >
                    Edit
                  </button>
                  
                  {/* Delete button - always visible */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    className="px-3 py-1.5 text-xs bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 border border-red-400 dark:border-red-500 cursor-pointer"
                    title="Delete menu item"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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

