'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FaEdit, 
  FaTrash, 
  FaPlus,
  FaUtensils,
  FaChevronDown,
  FaChevronRight,
  FaGripVertical
} from 'react-icons/fa';
import MenuItemModalForm from '@/components/menu-item-modal-form';
import MenuSectionModalForm from '@/components/menu-section-modal-form';
import StatusBadge from '@/components/status-badge';
import { showToast } from '@/components/toast';

interface MenuItem {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  price: string | null;
  priceNotes: string | null;
  modifiers: string | null;
  isAvailable: boolean;
  displayOrder: number;
}

interface MenuSection {
  id: string;
  name: string;
  description: string | null;
  menuType: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export default function AdminMenuSections({ initialSections }: { initialSections: MenuSection[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sections, setSections] = useState(initialSections);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [defaultSectionId, setDefaultSectionId] = useState<string | undefined>(undefined);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<MenuSection | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [itemReorderMode, setItemReorderMode] = useState<string | null>(null); // sectionId when items are being reordered
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  // Collapse all sections when entering reorder mode
  useEffect(() => {
    if (reorderMode) {
      setExpandedSectionId(null);
    }
  }, [reorderMode]);

  // Check for itemId in URL query params and open modal if present
  useEffect(() => {
    const itemId = searchParams.get('itemId');
    if (itemId) {
      handleItemClickById(itemId);
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('itemId');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleItemClickById = async (itemId: string) => {
    // Fetch full item data including modifiers
    try {
      const res = await fetch(`/api/menu-items/${itemId}`);
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
          modifiers: Array.isArray(modifiers) ? modifiers.join(', ') : '',
          isAvailable: fullItem.isAvailable,
          displayOrder: fullItem.displayOrder,
        });
        setDefaultSectionId(undefined);
        setItemModalOpen(true);
        // Expand the section containing this item
        setExpandedSectionId(fullItem.sectionId);
      }
    } catch (error) {
      console.error('Failed to load menu item:', error);
    }
  };

  const handleItemClick = async (item: MenuItem) => {
    // Fetch full item data including modifiers
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
          modifiers: Array.isArray(modifiers) ? modifiers.join(', ') : '',
          isAvailable: fullItem.isAvailable,
          displayOrder: fullItem.displayOrder,
        });
        setDefaultSectionId(undefined);
        setItemModalOpen(true);
      } else {
        // Fallback to using the item data we have
        setEditingItem({
          ...item,
          modifiers: item.modifiers || '',
        });
        setDefaultSectionId(undefined);
        setItemModalOpen(true);
      }
    } catch (error) {
      // Fallback to using the item data we have
      setEditingItem({
        ...item,
        modifiers: item.modifiers || '',
      });
      setDefaultSectionId(undefined);
      setItemModalOpen(true);
    }
  };

  const handleAddItem = (sectionId?: string) => {
    setEditingItem(null);
    setDefaultSectionId(sectionId);
    setItemModalOpen(true);
  };

  // Listen for custom event to open new item modal
  useEffect(() => {
    const handleOpenNewItem = () => {
      handleAddItem(undefined);
    };
    window.addEventListener('openNewItem', handleOpenNewItem);
    return () => {
      window.removeEventListener('openNewItem', handleOpenNewItem);
    };
  }, []);

  // Listen for custom event to open new section modal
  useEffect(() => {
    const handleOpenNewSection = () => {
      setEditingSection(null);
      setSectionModalOpen(true);
    };
    window.addEventListener('openNewSection', handleOpenNewSection);
    return () => {
      window.removeEventListener('openNewSection', handleOpenNewSection);
    };
  }, []);

  // Listen for custom event to toggle reorder mode
  useEffect(() => {
    const handleToggleReorderSections = () => {
      setReorderMode(prev => !prev);
    };
    window.addEventListener('toggleReorderSections', handleToggleReorderSections);
    return () => {
      window.removeEventListener('toggleReorderSections', handleToggleReorderSections);
    };
  }, []);

  // Broadcast reorder mode state changes
  useEffect(() => {
    const event = new CustomEvent('reorderSectionsStateChanged', { detail: { isActive: reorderMode } });
    window.dispatchEvent(event);
  }, [reorderMode]);

  const handleModalSuccess = () => {
    router.refresh();
    // Refresh sections from server
    router.refresh();
  };

  const handleEditSection = (section: MenuSection) => {
    setEditingSection(section);
    setSectionModalOpen(true);
  };

  const handleSectionModalClose = () => {
    setSectionModalOpen(false);
    setEditingSection(null);
  };

  const handleSectionModalSuccess = () => {
    router.refresh();
    handleSectionModalClose();
  };

  const handleDragStart = (sectionId: string) => {
    if (!reorderMode) return;
    setDraggedSection(sectionId);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    if (!reorderMode || !draggedSection) return;
    e.preventDefault();
    setDragOverSection(sectionId);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSectionId: string) => {
    if (!reorderMode || !draggedSection || draggedSection === targetSectionId) {
      handleDragEnd();
      return;
    }
    e.preventDefault();

    const draggedIndex = sections.findIndex(s => s.id === draggedSection);
    const targetIndex = sections.findIndex(s => s.id === targetSectionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);

    // Update displayOrder for all sections
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      displayOrder: index,
    }));

    setSections(updatedSections);

    // Save new order to API
    try {
      const updates = updatedSections.map((section, index) => ({
        id: section.id,
        displayOrder: index,
      }));

      await fetch('/api/menu-sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updates }),
      });

      router.refresh();
      showToast('Sections reordered successfully', 'success');
    } catch (error) {
      showToast('Failed to save new order', 'error');
      // Revert on error
      setSections(sections);
    }

    handleDragEnd();
  };

  const handleItemDragStart = (itemId: string) => {
    if (!itemReorderMode) return;
    setDraggedItem(itemId);
  };

  const handleItemDragOver = (e: React.DragEvent, itemId: string) => {
    if (!itemReorderMode || !draggedItem) return;
    e.preventDefault();
    setDragOverItem(itemId);
  };

  const handleItemDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleItemDrop = async (e: React.DragEvent, targetItemId: string, sectionId: string) => {
    if (!itemReorderMode || !draggedItem || draggedItem === targetItemId) {
      handleItemDragEnd();
      return;
    }
    e.preventDefault();

    const section = sections.find(s => s.id === sectionId);
    if (!section) {
      handleItemDragEnd();
      return;
    }

    const draggedIndex = section.items.findIndex(i => i.id === draggedItem);
    const targetIndex = section.items.findIndex(i => i.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      handleItemDragEnd();
      return;
    }

    const newItems = [...section.items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    // Update displayOrder for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      displayOrder: index,
    }));

    // Update the section in state
    const updatedSections = sections.map(s => 
      s.id === sectionId 
        ? { ...s, items: updatedItems }
        : s
    );

    setSections(updatedSections);

    // Save new order to API
    try {
      const updates = updatedItems.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));

      await fetch('/api/menu-items/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      });

      router.refresh();
      showToast('Items reordered successfully', 'success');
    } catch (error) {
      showToast('Failed to save new order', 'error');
      // Revert on error
      setSections(sections);
    }

    handleItemDragEnd();
  };

  const toggleItemReorderMode = (sectionId: string) => {
    setItemReorderMode(itemReorderMode === sectionId ? null : sectionId);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSectionId(expandedSectionId === sectionId ? null : sectionId);
  };

  async function handleDeleteSection(id: string) {
    if (!confirm('Are you sure you want to delete this section? This will delete all items in it.')) return;

    try {
      const res = await fetch(`/api/menu-sections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSections(sections.filter((s) => s.id !== id));
      }
    } catch (error) {
      alert('Failed to delete section');
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3">
          {sections.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center shadow-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <FaUtensils className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No menu sections yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Create your first section to get started</p>
              <button
                onClick={() => {
                  setEditingSection(null);
                  setSectionModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 border border-blue-400 dark:border-blue-500"
              >
                <FaPlus className="w-3 h-3" />
                <span>Create First Section</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
            {sections.map((section) => {
              const isExpanded = expandedSectionId === section.id;
              return (
                <div 
                  key={section.id} 
                  draggable={reorderMode}
                  onDragStart={() => handleDragStart(section.id)}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, section.id)}
                  className={`bg-white dark:bg-gray-800 rounded-lg border transition-all duration-200 overflow-hidden ${
                    reorderMode 
                      ? 'cursor-move border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md' 
                      : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
                  } ${
                    draggedSection === section.id ? 'opacity-50' : ''
                  } ${
                    dragOverSection === section.id ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400' : ''
                  }`}
                >
                  {/* Section Header */}
                  <div
                    className="group/section relative w-full p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => !reorderMode && toggleSection(section.id)}
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {reorderMode ? (
                            <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 cursor-move">
                              <FaGripVertical className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className={`flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                              {isExpanded ? (
                                <FaChevronDown className="w-4 h-4" />
                              ) : (
                                <FaChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          )}
                          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{section.name}</h2>
                          <span className="px-2 py-0.5 text-xs font-medium uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md flex-shrink-0 border border-gray-200 dark:border-gray-600">
                            {section.menuType}
                          </span>
                          <StatusBadge status={section.isActive ? 'active' : 'inactive'} />
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">
                            {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        {section.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 ml-6 mt-1">{section.description}</p>
                        )}
                      </div>
                      
                      {/* Right side actions */}
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Reorder Items Toggle - shown when section is expanded */}
                        {isExpanded && section.items.length > 0 && !reorderMode && (
                          <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input
                              type="checkbox"
                              checked={itemReorderMode === section.id}
                              onChange={() => toggleItemReorderMode(section.id)}
                              className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded cursor-pointer"
                            />
                            <span className="text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">Reorder Items</span>
                          </label>
                        )}
                        
                        {/* Delete button - always visible (disabled in reorder mode) */}
                        {!reorderMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(section.id);
                            }}
                            className="px-3 py-1.5 text-xs bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 border border-red-400 dark:border-red-500"
                            title="Delete section"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      
                      {/* Edit button - appears centered on hover (disabled in reorder mode) */}
                      {!reorderMode && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/section:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSection(section);
                            }}
                            className="pointer-events-auto px-4 py-2 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 z-10 border border-blue-400 dark:border-blue-500"
                            title="Click anywhere to edit"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Items - Collapsible with smooth animation (hidden in reorder mode) */}
                  {!reorderMode && (
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: isExpanded ? '10000px' : '0px',
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                    <div className="p-3 bg-gray-100/50 dark:bg-gray-700/30">
                      {section.items.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-600 dark:text-gray-400">No items in this section</p>
                        </div>
                      ) : (
                        <div>
                          {/* Show ALL items when expanded - Two Column Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {section.items.map((item) => {
                            // Parse modifiers if they exist
                            let modifiersList: string[] = [];
                            if (item.modifiers) {
                              try {
                                const parsed = typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers;
                                modifiersList = Array.isArray(parsed) ? parsed : [];
                              } catch {
                                // If parsing fails, treat as empty array
                                modifiersList = [];
                              }
                            }

                            return (
                              <div
                                key={item.id}
                                draggable={itemReorderMode === section.id}
                                onDragStart={() => handleItemDragStart(item.id)}
                                onDragOver={(e) => handleItemDragOver(e, item.id)}
                                onDragEnd={handleItemDragEnd}
                                onDrop={(e) => handleItemDrop(e, item.id, section.id)}
                                className={`group/item relative bg-white dark:bg-gray-800 rounded-lg border transition-all duration-200 flex flex-col ${
                                  itemReorderMode === section.id
                                    ? 'cursor-move border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md p-4'
                                    : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md p-4 cursor-pointer'
                                } ${
                                  draggedItem === item.id ? 'opacity-50' : ''
                                } ${
                                  dragOverItem === item.id ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400' : ''
                                }`}
                              >
                                <div
                                  className="flex-1 min-w-0"
                                  onClick={() => itemReorderMode !== section.id && handleItemClick(item)}
                                >
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    {itemReorderMode === section.id ? (
                                      <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 cursor-move">
                                        <FaGripVertical className="w-4 h-4" />
                                      </div>
                                    ) : null}
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
                                    <StatusBadge status={item.isAvailable ? 'available' : 'unavailable'} />
                                  </div>
                                  
                                  {/* Description */}
                                  {item.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                      {item.description}
                                    </p>
                                  )}
                                  
                                  {/* Price and Price Notes */}
                                  <div className="flex flex-col gap-1 mb-2">
                                    {item.price && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        Price: {item.price}
                                      </span>
                                    )}
                                    {item.priceNotes && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.priceNotes}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Modifiers */}
                                  {modifiersList.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {modifiersList.map((modifier, idx) => (
                                        <span
                                          key={idx}
                                          className="px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800"
                                        >
                                          {modifier}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Edit button - appears centered on hover (disabled in reorder mode) */}
                                {itemReorderMode !== section.id && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleItemClick(item);
                                      }}
                                      className="pointer-events-auto px-4 py-2 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 z-10 border border-blue-400 dark:border-blue-500"
                                      title="Click anywhere to edit"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  )}
                </div>
              );
              })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Menu Item Modal */}
      <MenuItemModalForm
        isOpen={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
          setDefaultSectionId(undefined);
        }}
        item={editingItem ? {
          id: editingItem.id,
          sectionId: editingItem.sectionId,
          name: editingItem.name,
          description: editingItem.description || '',
          price: editingItem.price || '',
          priceNotes: editingItem.priceNotes || '',
          modifiers: editingItem.modifiers ? (typeof editingItem.modifiers === 'string' ? JSON.parse(editingItem.modifiers) : []) : [],
          isAvailable: editingItem.isAvailable,
          displayOrder: editingItem.displayOrder,
        } : undefined}
        sections={sections.map(s => ({ id: s.id, name: s.name }))}
        defaultSectionId={defaultSectionId}
        onSuccess={handleModalSuccess}
      />

      {/* Menu Section Modal */}
      <MenuSectionModalForm
        isOpen={sectionModalOpen}
        onClose={handleSectionModalClose}
        section={editingSection ? {
          id: editingSection.id,
          name: editingSection.name,
          description: editingSection.description || '',
          menuType: editingSection.menuType,
          displayOrder: editingSection.displayOrder,
          isActive: editingSection.isActive,
        } : undefined}
        onSuccess={handleSectionModalSuccess}
      />
    </div>
  );
}

