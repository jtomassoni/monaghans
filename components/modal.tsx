'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
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
      className="fixed inset-0 z-50 bg-black/20 dark:bg-black/60 backdrop-blur-sm md:pl-64"
      onClick={onClose}
    >
      <div 
        className="h-full flex items-center justify-center px-6 py-3 overflow-visible"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[95vh] max-w-[1000px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-visible px-6 py-5">
          <div className="relative">
            {children}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

