'use client';

import { useState } from 'react';

export type StatusToggleType = 'active' | 'published' | 'available';

interface StatusToggleProps {
  type: StatusToggleType;
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

const toggleConfig: Record<StatusToggleType, { activeLabel: string; inactiveLabel: string; activeColor: string }> = {
  active: {
    activeLabel: 'Active',
    inactiveLabel: 'Inactive',
    activeColor: 'bg-green-600 hover:bg-green-700 shadow-green-500/30',
  },
  published: {
    activeLabel: 'Published',
    inactiveLabel: 'Draft',
    activeColor: 'bg-green-600 hover:bg-green-700 shadow-green-500/30',
  },
  available: {
    activeLabel: 'Available',
    inactiveLabel: 'Unavailable',
    activeColor: 'bg-green-600 hover:bg-green-700 shadow-green-500/30',
  },
};

export default function StatusToggle({ type, value, onChange, label, className = '' }: StatusToggleProps) {
  const config = toggleConfig[type];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={className}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{label}</label>
      )}
      <button
        type="button"
        onClick={() => onChange(!value)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
          value
            ? `${config.activeColor} text-white shadow-lg`
            : 'bg-gray-400 dark:bg-gray-700 hover:bg-gray-500 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300'
        }`}
      >
        <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
          value ? 'bg-white/30' : 'bg-gray-500'
        }`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </div>
        <span className="flex items-center gap-1.5">
          {value ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{config.activeLabel}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{config.inactiveLabel}</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}

