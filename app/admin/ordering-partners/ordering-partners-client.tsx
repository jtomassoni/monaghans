'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaExternalLinkAlt, FaCopy, FaShoppingCart, FaFacebook, FaTrashAlt } from 'react-icons/fa';

interface OrderingRedirectAnalytics {
  period: number;
  summary: {
    totalClicks: number;
    bySlug: Record<string, number>;
  };
  trends: { daily: Array<{ date: string; count: number }> };
  slugBreakdown: Array<{ slug: string; total: number }>;
  links: Record<string, string>;
  note: string;
}

const SLUG_LABELS: Record<string, { title: string; description: string; icon: typeof FaShoppingCart }> = {
  'online-ordering': {
    title: 'General pickup ordering',
    description: 'Website, menu, nav, email — /online-ordering',
    icon: FaShoppingCart,
  },
  'order-on-fb': {
    title: 'Facebook & social',
    description: 'Posts and ads — /order-on-fb',
    icon: FaFacebook,
  },
};

export default function OrderingPartnersClient({ isAdmin = false }: { isAdmin?: boolean }) {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<OrderingRedirectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reporting/ordering-redirects?period=${period}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load analytics');
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const resetCounts = async () => {
    if (!window.confirm('Reset all ordering link click counts to zero? This cannot be undone.')) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const res = await fetch('/api/reporting/ordering-redirects', { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to reset counts');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset counts');
    } finally {
      setResetting(false);
    }
  };

  const copyLink = async (path: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(path);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  const maxDaily = data?.trends.daily.reduce((m, d) => Math.max(m, d.count), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period</label>
        <select
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Refresh
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={resetCounts}
            disabled={resetting}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            <FaTrashAlt className="w-3.5 h-3.5" />
            {resetting ? 'Resetting…' : 'Reset counts'}
          </button>
        )}
      </div>

      {data?.note && (
        <p className="text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          {data.note}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {loading && !data ? (
        <p className="text-gray-500">Loading…</p>
      ) : data ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm max-w-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total link clicks</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {data.summary.totalClicks}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pickup-only — all links redirect to Toast pickup.</p>
          </div>

          <div className="space-y-4">
            {data.slugBreakdown.map((row) => {
              const meta = SLUG_LABELS[row.slug];
              const path = data.links[row.slug] || `/${row.slug}`;
              const Icon = meta?.icon || FaShoppingCart;
              return (
                <div
                  key={row.slug}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="p-3 rounded-lg bg-[#F63440]/10 text-[#F63440]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {meta?.title || row.slug}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {meta?.description}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                          {row.total}{' '}
                          <span className="text-sm font-normal text-gray-500">clicks</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyLink(path)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <FaCopy className="w-3.5 h-3.5" />
                        {copied === path ? 'Copied!' : 'Copy URL'}
                      </button>
                      <a
                        href={path}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-[#F63440] text-white hover:bg-[#d42a35]"
                      >
                        <FaExternalLinkAlt className="w-3.5 h-3.5" />
                        Test link
                      </a>
                    </div>
                  </div>
                  <code className="mt-3 block text-xs bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded text-gray-700 dark:text-gray-300 break-all">
                    {path}
                  </code>
                </div>
              );
            })}
          </div>

          {data.trends.daily.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Clicks per day</h3>
              <div className="space-y-2">
                {data.trends.daily.map((day) => (
                  <div key={day.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-gray-500 shrink-0">{day.date}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#F63440] rounded"
                        style={{ width: `${Math.max(4, (day.count / maxDaily) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium text-gray-900 dark:text-white">
                      {day.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
