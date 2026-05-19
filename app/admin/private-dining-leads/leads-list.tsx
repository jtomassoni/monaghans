'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import LeadFormModal from '@/components/lead-form-modal';
import { showToast } from '@/components/toast';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  groupSize: string;
  preferredDate: string | Date;
  message: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  hiddenAt?: string | Date | null;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string | Date;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }>;
  _count: {
    notes: number;
    contacts: number;
  };
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  quoted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  booked: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  lost: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function PrivateDiningLeadsList({
  initialLeads,
  initialRemovedLeads = [],
  userRole,
}: {
  initialLeads: Lead[];
  initialRemovedLeads?: Lead[];
  userRole: string;
}) {
  const router = useRouter();
  const [listView, setListView] = useState<'active' | 'removed'>('active');
  const [leads, setLeads] = useState(initialLeads);
  const [removedLeads, setRemovedLeads] = useState<Lead[]>(initialRemovedLeads);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [hidingLeadId, setHidingLeadId] = useState<string | null>(null);
  const [restoringLeadId, setRestoringLeadId] = useState<string | null>(null);
  const [newLeadCelebrationCount, setNewLeadCelebrationCount] = useState(0);
  const knownLeadIdsRef = useRef<Set<string>>(new Set(initialLeads.map((lead) => lead.id)));

  const isAdmin = userRole === 'admin';
  const listForView = listView === 'active' ? leads : removedLeads;

  useEffect(() => {
    setLeads(initialLeads);
    knownLeadIdsRef.current = new Set(initialLeads.map((lead) => lead.id));
  }, [initialLeads]);

  useEffect(() => {
    setRemovedLeads(initialRemovedLeads);
  }, [initialRemovedLeads]);

  useEffect(() => {
    let cancelled = false;
    let animationTimeout: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const url =
          isAdmin && listView === 'removed'
            ? '/api/private-dining-leads?removed=1'
            : '/api/private-dining-leads';
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return;

        const latest = (await response.json()) as Lead[];
        if (cancelled) return;

        if (listView === 'active') {
          const previousIds = knownLeadIdsRef.current;
          const incomingCount = latest.filter((lead) => !previousIds.has(lead.id)).length;

          setLeads(latest);
          knownLeadIdsRef.current = new Set(latest.map((lead) => lead.id));

          if (incomingCount > 0) {
            setNewLeadCelebrationCount(incomingCount);
            showToast(
              incomingCount === 1 ? 'New lead just came in!' : `${incomingCount} new leads just came in!`,
              'success'
            );
            if (animationTimeout) clearTimeout(animationTimeout);
            animationTimeout = setTimeout(() => {
              setNewLeadCelebrationCount(0);
            }, 3500);
          }
        } else {
          setRemovedLeads(latest);
        }
      } catch {
        // Keep polling resilient; no user-facing error for background refresh.
      }
    };

    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (animationTimeout) clearTimeout(animationTimeout);
    };
  }, [listView, isAdmin]);

  const handleLeadCreated = () => {
    // Refresh the page to get updated leads list
    router.refresh();
  };

  const handleRestoreLead = async (lead: Lead, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (
      !window.confirm(
        `Restore ${lead.name} to the active leads list? It will be visible to owners again.`
      )
    ) {
      return;
    }

    setRestoringLeadId(lead.id);
    try {
      const response = await fetch(`/api/private-dining-leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore lead');
      }

      setRemovedLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setFilteredLeads((prev) => prev.filter((l) => l.id !== lead.id));
      showToast('Lead restored', 'success');
      router.refresh();
    } catch {
      showToast('Failed to restore lead', 'error');
    } finally {
      setRestoringLeadId(null);
    }
  };

  const handleSoftRemoveFromList = async (lead: Lead, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (listView !== 'active') return;

    if (userRole === 'owner') {
      if (
        !window.confirm(
          `Remove ${lead.name} from the active list? The record is kept and an administrator can restore it later.`
        )
      ) {
        return;
      }
    } else if (userRole === 'admin') {
      if (
        !window.confirm(
          `Hide ${lead.name} from the active list? The lead stays in the database and can be restored from the Removed tab or lead page.`
        )
      ) {
        return;
      }
    } else {
      return;
    }

    setHidingLeadId(lead.id);
    try {
      const response = await fetch(`/api/private-dining-leads/${lead.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to hide lead');
      }

      const payload = (await response.json().catch(() => ({}))) as { softDeleted?: boolean };

      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setFilteredLeads((prev) => prev.filter((l) => l.id !== lead.id));

      if (payload.softDeleted) {
        showToast(userRole === 'owner' ? 'Lead removed from your list' : 'Lead hidden from the active list', 'success');
      } else {
        showToast('Lead updated', 'success');
      }
      router.refresh();
    } catch {
      showToast('Failed to hide lead', 'error');
    } finally {
      setHidingLeadId(null);
    }
  };

  const handlePermanentDelete = async (lead: Lead, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (userRole !== 'admin') return;

    if (
      !window.confirm(
        `Permanently delete ${lead.name}? This removes the lead and all related notes and contacts. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingLeadId(lead.id);
    try {
      const response = await fetch(`/api/private-dining-leads/${lead.id}?permanent=1`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      if (listView === 'removed') {
        setRemovedLeads((prev) => prev.filter((l) => l.id !== lead.id));
      } else {
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      }
      setFilteredLeads((prev) => prev.filter((l) => l.id !== lead.id));
      showToast('Lead permanently deleted', 'success');
      router.refresh();
    } catch {
      showToast('Failed to delete lead', 'error');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const sortOptions: SortOption<Lead>[] = [
    {
      label: 'Newest First',
      value: 'createdAt',
      sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    },
    {
      label: 'Oldest First',
      value: 'createdAt',
      sortFn: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      label: 'Preferred Date (Soonest)',
      value: 'preferredDate',
      sortFn: (a, b) => new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime(),
    },
    {
      label: 'Preferred Date (Latest)',
      value: 'preferredDate',
      sortFn: (a, b) => new Date(b.preferredDate).getTime() - new Date(a.preferredDate).getTime(),
    },
    {
      label: 'Name (A-Z)',
      value: 'name',
      sortFn: (a, b) => a.name.localeCompare(b.name),
    },
  ];

  const filterOptions: FilterOption<Lead>[] = [
    {
      label: 'All Statuses',
      value: 'all',
      filterFn: () => true,
    },
    {
      label: 'New',
      value: 'new',
      filterFn: (lead) => lead.status === 'new',
    },
    {
      label: 'Contacted',
      value: 'contacted',
      filterFn: (lead) => lead.status === 'contacted',
    },
    {
      label: 'Quoted',
      value: 'quoted',
      filterFn: (lead) => lead.status === 'quoted',
    },
    {
      label: 'Booked',
      value: 'booked',
      filterFn: (lead) => lead.status === 'booked',
    },
  ];

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-3">
      {newLeadCelebrationCount > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="animate-bounce rounded-full border border-emerald-300 bg-emerald-500/95 px-5 py-2 text-sm font-semibold text-white shadow-lg">
            🎉 {newLeadCelebrationCount === 1 ? 'New lead just came in!' : `${newLeadCelebrationCount} new leads just came in!`}
          </div>
        </div>
      ) : null}
      {isAdmin ? (
        <div
          className="inline-flex rounded-lg border border-gray-200/80 bg-white/80 p-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60"
          role="tablist"
          aria-label="Lead visibility"
        >
          <button
            type="button"
            role="tab"
            aria-selected={listView === 'active'}
            onClick={() => setListView('active')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              listView === 'active'
                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/80'
            }`}
          >
            Active leads
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listView === 'removed'}
            onClick={() => setListView('removed')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              listView === 'removed'
                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/80'
            }`}
          >
            Removed by owner ({removedLeads.length})
          </button>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex-1">
          <SearchSortFilter
            key={listView}
            items={listForView}
            onFilteredItemsChange={setFilteredLeads}
            sortOptions={sortOptions}
            filterOptions={filterOptions}
            searchPlaceholder="Search by name, email, phone..."
            searchFields={['name', 'email', 'phone', 'groupSize']}
          />
        </div>
        {listView === 'active' ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Lead
          </button>
        ) : null}
      </div>

      <LeadFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleLeadCreated}
      />

      {filteredLeads.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {listView === 'removed' ? 'No removed leads' : 'No leads found'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/private-dining-leads/${lead.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-[var(--color-accent)]/50 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left Section - Main Info */}
                <div className="flex-1 min-w-0">
                  {/* Name and Badges Row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {lead.name}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[lead.status] || statusColors.new}`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                    {listView === 'removed' && lead.hiddenAt ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        Hidden {formatDateTime(lead.hiddenAt)}
                      </span>
                    ) : null}
                  </div>

                  {/* Contact Info - Compact Grid */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.location.href = `mailto:${lead.email}`;
                      }}
                      className="flex items-center gap-1.5 hover:text-[var(--color-accent)] truncate bg-transparent border-0 p-0 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{lead.email}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.location.href = `tel:${lead.phone}`;
                      }}
                      className="flex items-center gap-1.5 hover:text-[var(--color-accent)] whitespace-nowrap bg-transparent border-0 p-0 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{lead.phone}</span>
                    </button>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{lead.groupSize}</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Preferred: {formatDate(lead.preferredDate)}</span>
                    </div>
                  </div>

                  {/* Notes, Contacts - Compact Footer */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {lead._count.notes > 0 && (
                      <span>
                        <span className="font-medium">{lead._count.notes}</span> note{lead._count.notes !== 1 ? 's' : ''}
                      </span>
                    )}
                    {lead._count.contacts > 0 && (
                      <span>
                        <span className="font-medium">{lead._count.contacts}</span> contact{lead._count.contacts !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Section - Timestamp */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(lead.createdAt)}
                  </div>
                  {new Date(lead.updatedAt).getTime() !== new Date(lead.createdAt).getTime() && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Updated {formatDate(lead.updatedAt)}
                    </div>
                  )}
                  {listView === 'removed' && isAdmin ? (
                    <div className="mt-2 flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => void handleRestoreLead(lead, e)}
                        disabled={restoringLeadId === lead.id || deletingLeadId === lead.id || hidingLeadId === lead.id}
                        className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-gray-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                      >
                        {restoringLeadId === lead.id ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void handlePermanentDelete(lead, e)}
                        disabled={deletingLeadId === lead.id || restoringLeadId === lead.id || hidingLeadId === lead.id}
                        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {deletingLeadId === lead.id ? 'Deleting...' : 'Delete forever'}
                      </button>
                    </div>
                  ) : isAdmin ? (
                    <div className="mt-2 flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => void handleSoftRemoveFromList(lead, e)}
                        disabled={hidingLeadId === lead.id || deletingLeadId === lead.id}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-gray-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                      >
                        {hidingLeadId === lead.id ? 'Hiding…' : 'Hide from list'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void handlePermanentDelete(lead, e)}
                        disabled={deletingLeadId === lead.id || hidingLeadId === lead.id}
                        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {deletingLeadId === lead.id ? 'Deleting…' : 'Delete forever'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => void handleSoftRemoveFromList(lead, e)}
                      disabled={hidingLeadId === lead.id}
                      className="mt-2 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      {hidingLeadId === lead.id ? 'Removing…' : 'Remove from list'}
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


