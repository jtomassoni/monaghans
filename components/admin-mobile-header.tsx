'use client';

import { FaBars } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useAdminMobileHeader } from './admin-mobile-header-context';

interface AdminMobileHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function AdminMobileHeader({ onMenuClick, title }: AdminMobileHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const { rightAction } = useAdminMobileHeader();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header 
      className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-30 flex items-center px-3 shadow-sm"
      suppressHydrationWarning
      style={{ zIndex: 30 }}
    >
      {/* Left: Hamburger Button */}
      <button
        onClick={(e) => {
          if (!mounted) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          onMenuClick();
        }}
        onTouchStart={(e) => {
          if (!mounted) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          onMenuClick();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300 touch-manipulation flex-shrink-0 ${
          mounted 
            ? 'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 active:scale-95 cursor-pointer' 
            : 'opacity-50 cursor-not-allowed'
        }`}
        aria-label="Open menu"
        type="button"
        disabled={!mounted}
        style={{ 
          pointerEvents: 'auto', 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <FaBars className="w-5 h-5 pointer-events-none" />
      </button>

      {/* Center: Title */}
      {title && (
        <div className="flex-1 flex items-center justify-center px-2 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate text-center">
            {title}
          </h1>
        </div>
      )}

      {/* Right: Action Button */}
      <div className="flex-shrink-0">
        {rightAction || <div className="w-10" />}
      </div>
    </header>
  );
}

