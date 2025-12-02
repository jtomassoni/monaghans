'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
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
      className="fixed inset-0 z-50 bg-black/20 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`h-full flex ${title && title.trim() ? 'items-start sm:items-center' : 'items-center'} justify-center px-3 sm:px-6 py-2 sm:py-4 overflow-y-auto overflow-x-visible`}
        onClick={onClose}
      >
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg sm:rounded-lg shadow-xl w-full ${title && title.trim() ? 'max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]' : 'max-h-[90vh]'} max-w-[500px] lg:max-w-[900px] flex flex-col ${title && title.trim() ? 'mt-0 sm:mt-0' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header - Sticky on mobile to ensure close button is always visible */}
        {title && title.trim() && (
          <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex justify-between items-center px-4 sm:px-6 py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0 rounded-t-lg">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white pr-2">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white text-3xl sm:text-2xl leading-none cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation -mr-1"
              aria-label="Close modal"
              type="button"
            >
              ×
            </button>
          </div>
        )}
        {(!title || !title.trim()) && (
          <div className="absolute top-0 right-0 z-10 p-2">
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white text-2xl leading-none cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close modal"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto overflow-x-visible ${title && title.trim() ? 'px-4 sm:px-6 py-3 sm:py-4' : 'px-6 sm:px-8 py-6 sm:py-8'}`}>
          <div className="relative">
            {children}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

