'use client';

import { FaBars } from 'react-icons/fa';
import { useState, useEffect } from 'react';

interface AdminMobileHeaderProps {
  onMenuClick: () => void;
}

export default function AdminMobileHeader({ onMenuClick }: AdminMobileHeaderProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Hamburger clicked'); // Debug
    onMenuClick();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Hamburger touched'); // Debug
    onMenuClick();
  };

  // Always render to prevent layout shift, but make invisible until mounted
  return (
    <div 
      className={`md:hidden fixed top-0 left-0 h-14 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 z-50 flex items-center shadow-lg ${!mounted ? 'invisible' : ''}`}
      style={{ zIndex: 50, pointerEvents: mounted ? 'auto' : 'none', width: '56px' }}
      suppressHydrationWarning
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Hamburger clicked'); // Debug
          onMenuClick();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Hamburger touched'); // Debug
          onMenuClick();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="h-14 w-14 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors text-gray-900 dark:text-white touch-manipulation"
        aria-label="Open menu"
        type="button"
        style={{ 
          pointerEvents: 'auto', 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'pointer',
          zIndex: 51,
          position: 'relative',
          minWidth: '56px',
          minHeight: '56px'
        }}
      >
        <FaBars className="w-6 h-6 pointer-events-none" style={{ pointerEvents: 'none' }} />
      </button>
    </div>
  );
}

