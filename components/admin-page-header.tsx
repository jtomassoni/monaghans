import { ReactNode } from 'react';
import HelpModal from './help-modal';
import { FeatureKey } from '@/lib/help-keywords';
import { FaQuestionCircle } from 'react-icons/fa';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: ReactNode;
  helpFeature?: FeatureKey;
  helpSlug?: string;
}

export default function AdminPageHeader({ 
  title, 
  description, 
  action, 
  badge,
  helpFeature,
  helpSlug,
}: AdminPageHeaderProps) {
  return (
    <header className="sticky top-[max(3.5rem,calc(3.5rem+env(safe-area-inset-top,0px)))] md:top-0 md:static flex-shrink-0 z-40 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between gap-2 min-h-[44px] px-2 sm:px-6 py-2 sm:py-2.5 min-w-0 overflow-x-auto">
        {/* Title - hidden on mobile (shown in mobile nav); visible on desktop */}
        <div className="hidden md:flex items-center gap-2 min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
          {badge}
          {description && (
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden lg:block truncate">
              {description}
            </p>
          )}
        </div>
        <div className="flex-1 md:hidden min-w-0" aria-hidden="true" />
        {/* All buttons in one row */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {helpFeature && (
            <HelpModal
              feature={helpFeature}
              slug={helpSlug}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors min-w-[36px] sm:min-w-0"
                  aria-label="Help"
                >
                  <FaQuestionCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Help</span>
                </button>
              }
            />
          )}
          {action}
        </div>
      </div>
    </header>
  );
}

