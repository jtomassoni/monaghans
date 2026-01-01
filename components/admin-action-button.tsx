'use client';

import { ReactNode } from 'react';
import { FaPlus } from 'react-icons/fa';

interface AdminActionButtonProps {
  onClick: () => void;
  label: string;
  shortLabel?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  icon?: ReactNode;
  className?: string;
}

export default function AdminActionButton({
  onClick,
  label,
  shortLabel,
  variant = 'primary',
  icon,
  className = '',
}: AdminActionButtonProps) {
  const variantStyles = {
    primary: 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 border-blue-400 dark:border-blue-500',
    secondary: 'bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 border-gray-400 dark:border-gray-500',
    success: 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 border-green-400 dark:border-green-500',
    warning: 'bg-yellow-500 dark:bg-yellow-600 hover:bg-yellow-600 dark:hover:bg-yellow-700 border-yellow-400 dark:border-yellow-500',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full sm:w-auto px-4 py-2.5 ${variantStyles[variant]} rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border touch-manipulation shadow-sm ${className}`}
    >
      {icon || <FaPlus className="w-4 h-4" />}
      <span className="hidden sm:inline">{label}</span>
      {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
      {!shortLabel && <span className="sm:hidden">{label.split(' ')[0]}</span>}
    </button>
  );
}


