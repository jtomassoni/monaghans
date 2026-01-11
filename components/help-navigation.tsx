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
    <div className="space-y-2">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
        <Link
          href="/help"
          className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <FaHome className="w-2.5 h-2.5" />
          Help
        </Link>
        <span>/</span>
        {backToFeature && (
          <>
            <Link
              href={`/help?feature=${currentDoc.metadata.feature}`}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {featureLabels[currentDoc.metadata.feature]}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-white font-medium truncate">
          {currentDoc.metadata.title}
        </span>
      </nav>

      {/* Previous/Next Navigation */}
      {(previousDoc || nextDoc) && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {previousDoc ? (
            <Link
              href={`/help?feature=${previousDoc.metadata.feature}&slug=${previousDoc.slug}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-1 min-w-0"
            >
              <FaChevronLeft className="w-3 h-3 flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Previous
                </span>
                <span className="line-clamp-1 text-xs truncate">{previousDoc.metadata.title}</span>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {nextDoc && (
            <Link
              href={`/help?feature=${nextDoc.metadata.feature}&slug=${nextDoc.slug}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-1 justify-end text-right min-w-0"
            >
              <div className="flex flex-col items-end min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Next
                </span>
                <span className="line-clamp-1 text-xs truncate">{nextDoc.metadata.title}</span>
              </div>
              <FaChevronRight className="w-3 h-3 flex-shrink-0" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

