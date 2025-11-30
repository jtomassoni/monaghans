'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { marked } from 'marked';

// Configure marked to allow HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface Announcement {
  id: string;
  title: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
}

interface AnnouncementModalProps {
  isOpen: boolean;
  announcement: Announcement | null;
  onAcknowledge: () => void;
}

export default function AnnouncementModal({ isOpen, announcement, onAcknowledge }: AnnouncementModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !announcement) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 sm:px-6"
      style={{ pointerEvents: 'auto' }}
      // Don't allow closing by clicking outside - no onClick handler
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-2 border-red-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-gradient-to-r from-red-500/10 to-red-600/10">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div className="flex-1">
            <span className="text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider block">
              Announcement
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{announcement.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {announcement.body && (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: marked.parse(announcement.body) }} 
            />
          )}
          {announcement.ctaText && announcement.ctaUrl && (
            <div className="mt-4">
              <Link
                href={announcement.ctaUrl}
                className="inline-block px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                onClick={onAcknowledge}
              >
                {announcement.ctaText}
              </Link>
            </div>
          )}
        </div>

        {/* Footer with Acknowledge Button */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onAcknowledge}
            className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

