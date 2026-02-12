'use client';

import { useState } from 'react';
import { FaQuestionCircle } from 'react-icons/fa';
import { FeatureKey } from '@/lib/help-keywords';
import HelpModal from './help-modal';

interface HelpTooltipProps {
  feature: FeatureKey;
  slug?: string;
  title?: string;
  content?: string;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Help Tooltip Component
 * Inline help tooltip for form fields and UI elements
 * Shows a question mark icon that opens a quick help modal on click
 */
export default function HelpTooltip({
  feature,
  slug,
  title,
  content,
  className = '',
  position = 'top',
}: HelpTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <HelpModal
        feature={feature}
        slug={slug}
        title={title}
        content={content}
        trigger={
          <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-help"
            title="Click for help"
            aria-label="Help"
          >
            <FaQuestionCircle className="w-3 h-3" />
          </button>
        }
      />
      
      {/* Optional: Show tooltip on hover (simple text tooltip) */}
      {isHovered && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap ${
            position === 'top' ? 'bottom-full mb-1' :
            position === 'bottom' ? 'top-full mt-1' :
            position === 'left' ? 'right-full mr-1' :
            'left-full ml-1'
          }`}
        >
          Click for help
        </div>
      )}
    </div>
  );
}

