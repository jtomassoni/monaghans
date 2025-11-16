'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaPlus } from 'react-icons/fa';
import AdminMenuSections from './menu-sections-list';
import DailySpecialsList from './daily-specials-list';
import DrinkSpecialsList from './drink-specials-list';
import MenuItemsList from './menu-items-list';

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

interface DailySpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  type: string;
  timeWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
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

interface DrinkSpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  type: string;
  appliesOn: string | null;
  timeWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface MenuTabsProps {
  sections: MenuSection[];
  specials: DailySpecial[];
  drinkSpecials: DrinkSpecial[];
  items: MenuItemWithSection[];
  sectionsForItems: Array<{ id: string; name: string }>;
}

export default function MenuTabs({ sections, specials, drinkSpecials, items, sectionsForItems }: MenuTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Set initial tab based on query parameter
  const getInitialTab = (): 'sections' | 'specials' | 'drinkSpecials' => {
    if (tabParam === 'specials') return 'specials';
    if (tabParam === 'drinkSpecials') return 'drinkSpecials';
    return 'sections';
  };
  
  const [activeTab, setActiveTab] = useState<'sections' | 'specials' | 'drinkSpecials'>(getInitialTab());
  const [sectionsViewMode, setSectionsViewMode] = useState<'sections' | 'items'>('sections');
  const [reorderSectionsActive, setReorderSectionsActive] = useState(false);

  // Update tab when query parameter changes
  useEffect(() => {
    if (tabParam === 'specials') {
      setActiveTab('specials');
    } else if (tabParam === 'drinkSpecials') {
      setActiveTab('drinkSpecials');
    }
  }, [tabParam]);

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
        <div className="flex items-center justify-between px-6 py-3">
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
              <button
                onClick={() => setActiveTab('specials')}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer group ${
                  activeTab === 'specials'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="relative z-10">Daily Specials</span>
                {activeTab === 'specials' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500/80 dark:bg-orange-600/80 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('drinkSpecials')}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer group ${
                  activeTab === 'drinkSpecials'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="relative z-10">Drink Specials</span>
                {activeTab === 'drinkSpecials' && (
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
            {activeTab === 'sections' ? (
              <>
                {sectionsViewMode === 'sections' && (
                  <>
                    {/* Reorder Sections Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
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
              </>
            ) : activeTab === 'specials' ? (
              <button
                onClick={() => {
                  const event = new CustomEvent('openNewSpecial');
                  window.dispatchEvent(event);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/90 dark:bg-orange-600/90 hover:bg-orange-600 dark:hover:bg-orange-700 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 border border-orange-400 dark:border-orange-500"
              >
                <FaPlus className="w-3.5 h-3.5 pointer-events-none" />
                <span className="pointer-events-none">New Special</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const event = new CustomEvent('openNewDrinkSpecial');
                  window.dispatchEvent(event);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 border border-blue-400 dark:border-blue-500"
              >
                <FaPlus className="w-3.5 h-3.5 pointer-events-none" />
                <span className="pointer-events-none">New Drink Special</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0 p-4">
        {activeTab === 'sections' ? (
          sectionsViewMode === 'sections' ? (
            <AdminMenuSections initialSections={sections} />
          ) : (
            <MenuItemsList initialItems={items} sections={sectionsForItems} />
          )
        ) : activeTab === 'specials' ? (
          <DailySpecialsList initialSpecials={specials} />
        ) : (
          <DrinkSpecialsList initialSpecials={drinkSpecials} />
        )}
      </div>
    </div>
  );
}

