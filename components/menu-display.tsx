'use client';

import { useState } from 'react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  priceNotes: string | null;
  modifiers: string | null;
}

interface MenuSection {
  id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

interface DailySpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  timeWindow: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
}

export default function MenuDisplay({
  breakfastSections,
  dinnerSections,
  dailySpecials = [],
}: {
  breakfastSections: MenuSection[];
  dinnerSections: MenuSection[];
  dailySpecials?: DailySpecial[];
}) {
  const [activeTab, setActiveTab] = useState<'breakfast' | 'dinner'>(
    breakfastSections.length > 0 ? 'breakfast' : 'dinner'
  );

  const sections = activeTab === 'breakfast' ? breakfastSections : dinnerSections;
  
  // Get today's special (most relevant one if multiple)
  const todaySpecial = dailySpecials.length > 0 ? dailySpecials[0] : null;

  return (
    <div className="space-y-4">
      {/* Daily Specials Section */}
      {todaySpecial && (
        <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/60 backdrop-blur-sm border-2 border-yellow-600 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Today&apos;s Special</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{todaySpecial.title}</h2>
          {todaySpecial.description && (
            <p className="text-gray-200 text-sm mb-2">{todaySpecial.description}</p>
          )}
          {todaySpecial.priceNotes && (
            <p className="text-yellow-400 font-semibold text-sm">{todaySpecial.priceNotes}</p>
          )}
        </div>
      )}

      {/* Tab Buttons */}
      {breakfastSections.length > 0 && dinnerSections.length > 0 && (
        <div className="flex gap-3 justify-center border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('breakfast')}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'breakfast'
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Breakfast Menu
          </button>
          <button
            onClick={() => setActiveTab('dinner')}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'dinner'
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Dinner Menu
          </button>
        </div>
      )}

      {/* Menu Sections */}
      {sections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">Menu coming soon!</p>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.id} className="space-y-2">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1 text-[var(--color-gold)]">
                {section.name}
              </h2>
              {section.description && (
                <p className="text-gray-400 italic text-xs mb-2">{section.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 p-2 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="text-sm font-semibold flex-1 min-w-0 break-words">{item.name}</h3>
                    {item.price && (
                      <span className="text-sm font-bold text-[var(--color-accent)] whitespace-nowrap flex-shrink-0">
                        {item.price}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-gray-300 text-xs mb-1">{item.description}</p>
                  )}
                  {item.priceNotes && (
                    <p className="text-gray-400 text-xs mb-1">{item.priceNotes}</p>
                  )}
                  {item.modifiers && (() => {
                    try {
                      const modifiers = JSON.parse(item.modifiers);
                      if (Array.isArray(modifiers) && modifiers.length > 0) {
                        return (
                          <div className="mt-1">
                            {modifiers.map((modifier: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-block text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded mr-1.5 mb-0.5"
                              >
                                {modifier}
                              </span>
                            ))}
                          </div>
                        );
                      }
                    } catch (error) {
                      // Silently handle invalid JSON - modifiers will not be displayed
                      console.warn('Invalid modifiers JSON for item:', item.name, error);
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

