'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import HelpModal from './help-modal';
import { FeatureKey } from '@/lib/help-keywords';
import { FaQuestionCircle } from 'react-icons/fa';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  helpFeature?: FeatureKey;
  helpSlug?: string;
  zIndex?: number;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, helpFeature, helpSlug, zIndex = 9998, maxWidth }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/30 dark:bg-black/70 backdrop-blur-md"
      style={{ zIndex }}
      onClick={onClose}
      suppressHydrationWarning
    >
      <div 
        className={`h-full flex items-center justify-center px-0 sm:px-6 pt-14 sm:pt-6 pb-6 sm:pb-6 overflow-y-auto overflow-x-visible`}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? undefined : undefined}
          className={`bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 ${!title || !title.trim() ? 'w-full h-full sm:w-auto sm:h-auto sm:max-w-md' : maxWidth ? `w-full sm:w-auto ${maxWidth} sm:max-h-[calc(100vh-2rem)]` : 'w-full sm:w-auto sm:max-w-[420px] lg:max-w-[900px] sm:max-h-[calc(100vh-2rem)]'} flex flex-col overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header - Sticky within modal to ensure it's always visible */}
        {title && title.trim() && (
          <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex justify-between items-center pl-4 sm:pl-6 pr-3 sm:pr-6 py-3 sm:py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0 shadow-sm">
            <h2 className="text-lg sm:text-lg font-bold text-gray-900 dark:text-white pr-2 truncate flex-1 min-w-0">{title}</h2>
            <div className="flex items-center gap-2 shrink-0">
              {helpFeature && (
                <HelpModal
                  feature={helpFeature}
                  slug={helpSlug}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors shrink-0"
                      title="Help"
                    >
                      <FaQuestionCircle className="w-4 h-4" />
                      <span>Help</span>
                    </button>
                  }
                />
              )}
              <button
                onClick={onClose}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-3xl sm:text-2xl leading-none cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation shrink-0 font-light"
                aria-label="Close modal"
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto overflow-x-visible ${title && title.trim() ? 'px-4 sm:px-5 py-4 sm:py-5' : 'px-6 sm:px-8 py-6 sm:py-8'} pb-20 sm:pb-0`}>
          <div className="relative">
            {children}
          </div>
        </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

