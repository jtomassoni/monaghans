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

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div 
      className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-[100000] flex items-center shadow-lg" 
      style={{ zIndex: 100000, pointerEvents: 'auto' }}
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
          zIndex: 100001,
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

