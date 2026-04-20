'use client';

import { useState, type ComponentProps } from 'react';
import PrivateDiningLeadsList from './leads-list';
import PrivateDiningCommunicationsPanel from '@/components/private-dining-communications-panel';

type Lead = ComponentProps<typeof PrivateDiningLeadsList>['initialLeads'][number];

export default function PrivateDiningLeadsTabs({ initialLeads }: { initialLeads: Lead[] }) {
  const [tab, setTab] = useState<'leads' | 'email'>('leads');

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-lg border border-gray-200/80 bg-white/60 p-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60"
        role="tablist"
        aria-label="Private dining sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'leads'}
          id="pd-tab-leads"
          aria-controls="pd-panel-leads"
          onClick={() => setTab('leads')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'leads'
              ? 'bg-[var(--color-accent)] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/80'
          }`}
        >
          Leads
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'email'}
          id="pd-tab-email"
          aria-controls="pd-panel-email"
          onClick={() => setTab('email')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'email'
              ? 'bg-[var(--color-accent)] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/80'
          }`}
        >
          Email alerts
        </button>
      </div>

      <div
        id="pd-panel-leads"
        role="tabpanel"
        aria-labelledby="pd-tab-leads"
        hidden={tab !== 'leads'}
        className={tab !== 'leads' ? 'hidden' : undefined}
      >
        <PrivateDiningLeadsList initialLeads={initialLeads} />
      </div>

      <div
        id="pd-panel-email"
        role="tabpanel"
        aria-labelledby="pd-tab-email"
        hidden={tab !== 'email'}
        className={tab !== 'email' ? 'hidden' : undefined}
      >
        <PrivateDiningCommunicationsPanel />
      </div>
    </div>
  );
}
