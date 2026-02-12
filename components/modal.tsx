'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Optional max height (e.g. '75vh') so the modal stays compact and above the fold */
  maxHeight?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxHeight }: ModalProps) {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/30 dark:bg-black/70 backdrop-blur-md"
      onClick={onClose}
      suppressHydrationWarning
    >
      <div 
        className={`h-full flex items-center justify-center px-0 sm:px-6 pt-14 sm:pt-6 pb-6 sm:pb-6 overflow-y-auto overflow-x-visible`}
        onClick={onClose}
      >
        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 flex flex-col backdrop-blur-xl min-h-0 ${!title || !title.trim() ? 'w-full h-full sm:w-auto sm:h-auto sm:max-w-md' : 'w-full sm:w-auto sm:max-w-[420px] lg:max-w-[900px]'}`}
          style={title && title.trim() ? { maxHeight: maxHeight ?? 'calc(100vh - 2rem)' } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header - Sticky within modal to ensure it's always visible */}
        {title && title.trim() && (
          <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex justify-between items-center pl-4 sm:pl-6 pr-3 sm:pr-6 py-3 sm:py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0 shadow-sm">
            <h2 className="text-lg sm:text-lg font-bold text-gray-900 dark:text-white pr-2 truncate flex-1 min-w-0">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-3xl sm:text-2xl leading-none cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation shrink-0 font-light"
              aria-label="Close modal"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* Content - scrolls when content exceeds viewport; extra bottom padding on mobile so content can scroll above fixed footers */}
        <div
          className={`flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden ${title && title.trim() ? 'px-4 sm:px-5 py-4 sm:py-5' : 'px-6 sm:px-8 py-6 sm:py-8'} pb-32 sm:pb-0`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="relative">
            {children}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

