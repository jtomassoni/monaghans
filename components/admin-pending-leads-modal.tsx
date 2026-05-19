'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type PendingLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  groupSize: string;
  preferredDate: string;
  status: string;
  createdAt: string;
};

export default function AdminPendingLeadsModal() {
  const pathname = usePathname();
  const [leads, setLeads] = useState<PendingLead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/private-dining-leads/pending-acknowledgment', {
        credentials: 'include',
      });
      if (!res.ok) {
        setLeads([]);
        return;
      }
      const data = await res.json();
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch {
      setError('Could not load new leads.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  const acknowledge = async (leadIds: string[]) => {
    const res = await fetch('/api/private-dining-leads/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ leadIds }),
    });
    if (!res.ok) throw new Error('Acknowledge failed');
  };

  const handleAckOne = async (id: string) => {
    setBusyIds((s) => new Set(s).add(id));
    try {
      await acknowledge([id]);
      setLeads((prev) => (prev ? prev.filter((l) => l.id !== id) : prev));
    } catch {
      setError('Could not update. Try again.');
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const handleAckAll = async () => {
    if (!leads?.length) return;
    const ids = leads.map((l) => l.id);
    setBusyIds(new Set(ids));
    try {
      await acknowledge(ids);
      setLeads([]);
    } catch {
      setError('Could not acknowledge all. Try again.');
    } finally {
      setBusyIds(new Set());
    }
  };

  if (loading || leads === null) {
    return null;
  }

  if (leads.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-leads-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-600 dark:bg-gray-800">
        <div className="shrink-0 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 id="pending-leads-title" className="text-lg font-bold text-gray-900 dark:text-white">
            New private dining leads
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Review and acknowledge each lead below. This stays open until they’re acknowledged.
          </p>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className="mb-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 last:mb-0 dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                  <p className="truncate text-sm text-gray-600 dark:text-gray-400">{lead.email}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {new Date(lead.preferredDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {' · '}
                    {lead.groupSize}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    href={`/admin/private-dining-leads/${lead.id}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    disabled={busyIds.has(lead.id)}
                    onClick={() => handleAckOne(lead.id)}
                    className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busyIds.has(lead.id) ? '…' : 'Got it'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="shrink-0 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            disabled={busyIds.size > 0}
            onClick={handleAckAll}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white disabled:opacity-50"
          >
            Acknowledge all ({leads.length})
          </button>
        </div>
      </div>
    </div>
  );
}
