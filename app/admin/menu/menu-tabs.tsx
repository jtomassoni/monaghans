'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaUpload } from 'react-icons/fa';
import AdminMenuSections from './menu-sections-list';
import MenuItemsList from './menu-items-list';
import MenuImportModal from '@/components/menu-import-modal';
import { useFeatureFlag } from '@/lib/use-feature-flags';

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

interface MenuTabsProps {
  sections: MenuSection[];
  items: MenuItemWithSection[];
  sectionsForItems: Array<{ id: string; name: string }>;
}

export default function MenuTabs({ sections, items, sectionsForItems }: MenuTabsProps) {
  const [activeTab, setActiveTab] = useState<'sections'>('sections');
  const [sectionsViewMode, setSectionsViewMode] = useState<'sections' | 'items'>('sections');
  const [reorderSectionsActive, setReorderSectionsActive] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const menuImportEnabled = useFeatureFlag('menu_import');


  // Listen for reorder sections state changes
  useEffect(() => {
    const handleReorderStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isActive: boolean }>;
      setReorderSectionsActive(customEvent.detail.isActive);
    };
    window.addEventListener('reorderSectionsStateChanged', handleReorderStateChange);
    return () => {
      window.removeEventListener('reorderSectionsStateChanged', handleReorderStateChange);
    };
  }, []);


  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Tabs with Action Buttons */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 relative z-10">
        {/* Mobile: Simplified Header */}
        <div className="md:hidden px-4 py-3 space-y-3">
          {/* Mobile Tab Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sections')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'sections'
                  ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Sections
            </button>
            {activeTab === 'sections' && (
              <button
                onClick={() => setSectionsViewMode(sectionsViewMode === 'sections' ? 'items' : 'sections')}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {sectionsViewMode === 'sections' ? 'All Items' : 'Sections'}
              </button>
            )}
          </div>
          {/* Mobile Action Buttons */}
          <div className="flex gap-2">
            {sectionsViewMode === 'sections' && (
              <button
                onClick={() => {
                  const event = new CustomEvent('openNewItem');
                  window.dispatchEvent(event);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200"
              >
                <FaPlus className="w-4 h-4" />
                <span>New Item</span>
              </button>
            )}
            <button
              onClick={() => {
                const event = new CustomEvent('openNewSection');
                window.dispatchEvent(event);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200"
            >
              <FaPlus className="w-4 h-4" />
              <span>New Section</span>
            </button>
            {menuImportEnabled && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/90 dark:bg-green-600/90 hover:bg-green-600 dark:hover:bg-green-700 rounded-lg text-white font-medium text-sm transition-all duration-200"
              >
                <FaUpload className="w-4 h-4" />
                <span>Import</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop: Full Header */}
        <div className="hidden md:flex items-center justify-between px-6 py-3">
          {/* Tab Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('sections')}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer group ${
                  activeTab === 'sections'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="relative z-10">Menu Sections</span>
                {activeTab === 'sections' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/80 dark:bg-blue-600/80 rounded-full"></span>
                )}
              </button>
            </div>

            {/* View Toggle for Sections Tab - Elegant Pill Style */}
            {activeTab === 'sections' && (
              <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full p-1">
                  <button
                    onClick={() => setSectionsViewMode('sections')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer ${
                      sectionsViewMode === 'sections'
                        ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Sections
                  </button>
                  <button
                    onClick={() => setSectionsViewMode('items')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer ${
                      sectionsViewMode === 'items'
                        ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    All Items
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {sectionsViewMode === 'sections' && sections.length > 1 && (
              <>
                {/* Reorder Sections Toggle - Desktop Only */}
                <label className="hidden md:flex items-center gap-2 cursor-pointer px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={reorderSectionsActive}
                    onChange={() => {
                      const event = new CustomEvent('toggleReorderSections');
                      window.dispatchEvent(event);
                    }}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 rounded cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">Reorder Sections</span>
                </label>
                <button
                  onClick={() => {
                    const event = new CustomEvent('openNewItem');
                    window.dispatchEvent(event);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 border border-blue-400 dark:border-blue-500"
                >
                  <FaPlus className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">New Item</span>
                </button>
              </>
            )}
            <button
              onClick={() => {
                const event = new CustomEvent('openNewSection');
                window.dispatchEvent(event);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 border border-blue-400 dark:border-blue-500"
            >
              <FaPlus className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">New Section</span>
            </button>
            {menuImportEnabled && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/90 dark:bg-green-600/90 hover:bg-green-600 dark:hover:bg-green-700 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 border border-green-400 dark:border-green-500"
              >
                <FaUpload className="w-3.5 h-3.5 pointer-events-none" />
                <span className="pointer-events-none">Import Menu</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0 p-4">
        {sectionsViewMode === 'sections' ? (
          <AdminMenuSections initialSections={sections} />
        ) : (
          <MenuItemsList initialItems={items} sections={sectionsForItems} />
        )}
      </div>

      {/* Import Modal */}
      {menuImportEnabled && (
        <MenuImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={() => {
            setIsImportModalOpen(false);
            // Reload the page to show imported items
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

