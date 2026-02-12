'use client';

import Link from 'next/link';
import { FaQuestionCircle } from 'react-icons/fa';
import { FeatureKey } from '@/lib/help-keywords';

interface HelpButtonProps {
  feature: FeatureKey;
  slug?: string;
  variant?: 'button' | 'icon' | 'link';
  className?: string;
  children?: React.ReactNode;
}

const featureLabels: Record<FeatureKey, string> = {
  events: 'Calendar & Events',
  menu: 'Menu Management',
  specials: 'Specials',
  announcements: 'Announcements',
  homepage: 'Homepage',
  signage: 'Digital Signage',
  settings: 'Settings',
};

export default function HelpButton({
  feature,
  slug,
  variant = 'button',
  className = '',
  children,
}: HelpButtonProps) {
  const href = slug
    ? `/admin/help?feature=${feature}&slug=${slug}`
    : `/admin/help?feature=${feature}`;

  if (variant === 'icon') {
    return (
      <Link
        href={href}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors ${className}`}
        title={`Help: ${featureLabels[feature]}`}
      >
        <FaQuestionCircle className="w-4 h-4" />
      </Link>
    );
  }

  if (variant === 'link') {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors ${className}`}
      >
        <FaQuestionCircle className="w-4 h-4" />
        {children || 'Help'}
      </Link>
    );
  }

  // Default: button variant
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors ${className}`}
    >
      <FaQuestionCircle className="w-4 h-4" />
      {children || 'Help'}
    </Link>
  );
}

