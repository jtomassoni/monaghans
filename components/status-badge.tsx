'use client';

export type StatusType = 'active' | 'inactive' | 'published' | 'draft' | 'scheduled' | 'past' | 'expired' | 'available' | 'unavailable';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; classes: string }> = {
  active: {
    label: 'Active',
    classes: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  },
  inactive: {
    label: 'Inactive',
    classes: 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-500 border border-gray-300 dark:border-gray-600',
  },
  published: {
    label: 'Published',
    classes: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  },
  draft: {
    label: 'Draft',
    classes: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  },
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
  },
  past: {
    label: 'Past',
    classes: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  },
  expired: {
    label: 'Expired',
    classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  },
  available: {
    label: 'Available',
    classes: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  },
  unavailable: {
    label: 'Unavailable',
    classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) return null;

  return (
    <span
      className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

