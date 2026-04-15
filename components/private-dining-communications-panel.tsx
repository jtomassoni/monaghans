'use client';

import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/components/toast';

type Recipient = { email: string; status: 'verified' | 'pending'; active: boolean };

type LoadState = {
  emails: string[];
  recipients: Recipient[];
  resendConfigured: boolean;
};

export default function PrivateDiningCommunicationsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [resendConfigured, setResendConfigured] = useState(false);
  const [togglingEmail, setTogglingEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/private-dining-notifications');
      const data = (await res.json()) as LoadState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load');
      }
      setText(data.emails.join('\n'));
      setRecipients(data.recipients);
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

  const applyLoadState = (data: LoadState) => {
    setText(data.emails.join('\n'));
    setRecipients(data.recipients);
    setResendConfigured(data.resendConfigured);
  };

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
      const data = (await res.json()) as LoadState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      applyLoadState(data);
      showToast('Notification recipients saved. Pending addresses get a verification email.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmailAlerts = async (email: string, nextActive: boolean) => {
    setTogglingEmail(email);
    try {
      const res = await fetch('/api/admin/private-dining-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, active: nextActive }),
      });
      const data = (await res.json()) as LoadState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update');
      }
      applyLoadState(data);
      showToast(nextActive ? 'Email alerts turned on' : 'Email alerts turned off', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update', 'error');
    } finally {
      setTogglingEmail(null);
    }
  };

  const pending = recipients.filter((r) => r.status === 'pending');

  return (
    <div className="mb-6 rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm dark:border-amber-900/40 dark:bg-gray-800/90">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Communications</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Staff addresses added here can receive private dining lead alerts by email (Resend). Each
            address must verify from their inbox before alerts; you can turn alerts off per person without
            removing them. Addresses are never shown on the public site.
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
        Separate with commas or new lines. New addresses receive a verification email before alerts go out.
      </p>

      {!loading && recipients.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Email alerts per address</p>
          <ul className="space-y-2">
            {recipients.map((r) => (
              <li
                key={r.email}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-gray-600 dark:bg-gray-900/50"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{r.email}</span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                    }`}
                  >
                    {r.status}
                  </span>
                  {!r.active && (
                    <span className="inline-flex shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      alerts off
                    </span>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="whitespace-nowrap">Email alerts</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                    checked={r.active}
                    disabled={togglingEmail === r.email}
                    onChange={(e) => void toggleEmailAlerts(r.email, e.target.checked)}
                  />
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
          {pending.length} address{pending.length !== 1 ? 'es' : ''} still need to verify from their email.
        </p>
      )}

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
