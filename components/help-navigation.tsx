'use client';

import Link from 'next/link';
import { FaChevronLeft, FaChevronRight, FaHome } from 'react-icons/fa';
import { HelpDoc } from '@/lib/help-content-loader';
import { FeatureKey } from '@/lib/help-keywords';

interface HelpNavigationProps {
  currentDoc: HelpDoc;
  allDocs: HelpDoc[];
  backToFeature?: boolean;
}

/**
 * Help Navigation Component
 * Provides Previous/Next article navigation and breadcrumb navigation
 */
export default function HelpNavigation({
  currentDoc,
  allDocs,
  backToFeature = true,
}: HelpNavigationProps) {
  // Find all docs in the same feature, sorted
  const sameFeatureDocs = allDocs
    .filter((d) => d.metadata.feature === currentDoc.metadata.feature)
    .sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));

  // Find current doc index
  const currentIndex = sameFeatureDocs.findIndex(
    (d) => d.slug === currentDoc.slug
  );

  const previousDoc =
    currentIndex > 0 ? sameFeatureDocs[currentIndex - 1] : null;
  const nextDoc =
    currentIndex < sameFeatureDocs.length - 1
      ? sameFeatureDocs[currentIndex + 1]
      : null;

  const featureLabels: Record<FeatureKey, string> = {
    events: 'Calendar & Events',
    menu: 'Menu Management',
    specials: 'Specials',
    announcements: 'Announcements',
    homepage: 'Homepage',
    signage: 'Digital Signage',
    settings: 'Settings',
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm flex-1 min-w-0">
        <Link
          href="/admin/help"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5 font-medium flex-shrink-0"
        >
          <FaHome className="w-3.5 h-3.5" />
          <span>Help</span>
        </Link>
        <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">/</span>
        {backToFeature && (
          <>
            <Link
              href={`/admin/help?feature=${currentDoc.metadata.feature}`}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors font-medium flex-shrink-0"
            >
              {featureLabels[currentDoc.metadata.feature]}
            </Link>
            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-white font-semibold truncate min-w-0">
          {currentDoc.metadata.title}
        </span>
      </nav>

      {/* Previous/Next Navigation - Always in same position */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Previous Button - Always rendered in same spot */}
        {previousDoc ? (
          <Link
            href={`/admin/help?feature=${previousDoc.metadata.feature}&slug=${previousDoc.slug}`}
            className="group flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
          >
            <FaChevronLeft className="w-3.5 h-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
            <span className="line-clamp-1 text-sm truncate text-gray-900 dark:text-white max-w-[180px]">
              {previousDoc.metadata.title}
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg opacity-50 cursor-not-allowed">
            <FaChevronLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1 text-sm truncate max-w-[180px]">
              Previous
            </span>
          </div>
        )}

        {/* Next Button - Always rendered in same spot */}
        {nextDoc ? (
          <Link
            href={`/admin/help?feature=${nextDoc.metadata.feature}&slug=${nextDoc.slug}`}
            className="group flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
          >
            <span className="line-clamp-1 text-sm truncate text-gray-900 dark:text-white max-w-[180px]">
              {nextDoc.metadata.title}
            </span>
            <FaChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg opacity-50 cursor-not-allowed">
            <span className="line-clamp-1 text-sm truncate max-w-[180px]">
              Next
            </span>
            <FaChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}

