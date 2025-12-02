'use client';

import { useState } from 'react';

interface ReadMoreSectionProps {
  preview: React.ReactNode;
  fullContent: React.ReactNode;
  previewLines?: number;
}

export default function ReadMoreSection({ preview, fullContent, previewLines = 3 }: ReadMoreSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <div className="text-gray-300 leading-relaxed">
        {preview}
      </div>
      {isExpanded && (
        <div className="mt-4 text-gray-300 leading-relaxed">
          {fullContent}
        </div>
      )}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-4 text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] font-semibold flex items-center gap-2 transition-colors"
      >
        {isExpanded ? (
          <>
            <span>Read Less</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </>
        ) : (
          <>
            <span>Read More</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

