'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FeatureKey } from '@/lib/help-keywords';
import { HelpDoc } from '@/lib/help-content-loader';
import { 
  FaCalendarAlt, 
  FaUtensils, 
  FaStar, 
  FaBullhorn, 
  FaHome, 
  FaTv, 
  FaCog,
  FaBook,
  FaBars,
  FaTimes
} from 'react-icons/fa';

interface HelpGutterNavProps {
  docsByFeature: Record<FeatureKey, HelpDoc[]>;
  featureColors: Record<FeatureKey, {
    bg: string;
    bgHover: string;
    border: string;
    borderHover: string;
    text: string;
    textHover: string;
    badge: string;
    badgeText: string;
    gradient: string;
  }>;
}

const featureLabels: Record<FeatureKey, string> = {
  events: 'Calendar & Events',
  menu: 'Menu Management',
  specials: 'Specials',
  announcements: 'Announcements',
  homepage: 'Homepage',
  signage: 'Digital Signage',
  settings: 'Settings',
};

const featureIcons: Record<FeatureKey, typeof FaCalendarAlt> = {
  events: FaCalendarAlt,
  menu: FaUtensils,
  specials: FaStar,
  announcements: FaBullhorn,
  homepage: FaHome,
  signage: FaTv,
  settings: FaCog,
};

export default function HelpGutterNav({ docsByFeature, featureColors }: HelpGutterNavProps) {
  const searchParams = useSearchParams();
  const currentFeature = searchParams.get('feature') as FeatureKey | null;
  const currentSlug = searchParams.get('slug');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="p-4 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <Link
          href="/help"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          onClick={() => setIsMobileOpen(false)}
        >
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md">
            <FaBook className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            All Help
          </span>
        </Link>
      </div>
      
      <div className="p-2 space-y-1">
        {(Object.keys(docsByFeature) as FeatureKey[]).map((featureKey) => {
          const featureDocs = docsByFeature[featureKey];
          if (featureDocs.length === 0) return null;
          
          const colors = featureColors[featureKey];
          const Icon = featureIcons[featureKey];
          const isActive = currentFeature === featureKey && !currentSlug;
          const isActiveArticle = currentFeature === featureKey && currentSlug;

          return (
            <div key={featureKey}>
              <Link
                href={`/help?feature=${featureKey}`}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? `${colors.bg} ${colors.border} border-l-4 shadow-sm`
                    : `hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isActiveArticle ? 'bg-gray-50 dark:bg-gray-700/30' : ''}`
                }`}
              >
                <div className={`p-1.5 rounded-md bg-gradient-to-br ${colors.gradient} flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${
                    isActive 
                      ? colors.text 
                      : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                  } transition-colors`}>
                    {featureLabels[featureKey]}
                  </div>
                  <div className={`text-xs mt-0.5 ${
                    isActive 
                      ? colors.badgeText 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {featureDocs.length} article{featureDocs.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {isActive && (
                  <div className={`w-1.5 h-1.5 rounded-full ${colors.badge}`}></div>
                )}
              </Link>
              
              {/* Show articles when this feature is active */}
              {isActiveArticle && (
                <div className="ml-4 mt-1 space-y-0.5 pl-7 border-l-2 border-gray-200 dark:border-gray-700">
                  {featureDocs.map((doc) => {
                    const isCurrentArticle = doc.slug === currentSlug;
                    return (
                      <Link
                        key={doc.slug}
                        href={`/help?feature=${featureKey}&slug=${doc.slug}`}
                        onClick={() => setIsMobileOpen(false)}
                        className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                          isCurrentArticle
                            ? `${colors.bg} ${colors.text} font-medium`
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        {doc.metadata.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-24 left-4 z-50 p-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all"
        aria-label="Toggle navigation"
      >
        {isMobileOpen ? (
          <FaTimes className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <FaBars className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <nav className={`
        fixed lg:static top-0 left-0 z-50
        w-64 h-full
        flex-shrink-0
        border-r border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-lg lg:shadow-none
      `}>
        <NavContent />
      </nav>
    </>
  );
}

