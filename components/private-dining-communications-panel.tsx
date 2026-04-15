'use client';

import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/components/toast';

type LoadState = { emails: string[]; resendConfigured: boolean };

export default function PrivateDiningCommunicationsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');
  const [resendConfigured, setResendConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/private-dining-notifications');
      const data = (await res.json()) as LoadState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load');
      }
      setText(data.emails.join('\n'));
      setResendConfigured(data.resendConfigured);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load communications', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const emails = text
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/private-dining-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      setText(data.emails.join('\n'));
      showToast('Notification recipients saved', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm dark:border-amber-900/40 dark:bg-gray-800/90">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Communications</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            When someone submits the public private dining form, these addresses receive an email via
            Resend. Addresses are stored server-side only — they never appear on the website.
          </p>
        </div>
        {!loading && (
          <span
            className={`mt-2 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium sm:mt-0 ${
              resendConfigured
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
            }`}
          >
            {resendConfigured ? 'Resend env configured' : 'Resend env missing'}
          </span>
        )}
      </div>

      {!resendConfigured && !loading && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Set <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">RESEND_API_KEY</code> and{' '}
          <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">RESEND_FROM</code> (your
          verified sender, e.g. <code className="rounded px-1">Private Dining &lt;events@yourdomain.com&gt;</code>)
          in the server environment. See .env.example.
        </p>
      )}

      <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Staff notification emails
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          rows={4}
          placeholder={'one@restaurant.com\nevents@restaurant.com'}
          className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
      </label>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Separate with commas or new lines. Duplicates and invalid addresses are removed when you save.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save recipients'}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading || saving}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
