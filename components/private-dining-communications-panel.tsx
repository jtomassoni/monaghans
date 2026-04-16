'use client';

import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/components/toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 422 responses use a short `error` summary; 500s usually put specifics in `details`. */
function apiErrorMessage(
  data: { error?: string; details?: string },
  fallback: string,
  status?: number
) {
  if (status === 422) {
    const e = data.error?.trim();
    if (e) return e;
  }
  const d = data.details?.trim();
  if (d) return d;
  const e = data.error?.trim();
  if (e) return e;
  return fallback;
}

type Recipient = {
  email: string;
  status: 'verified' | 'pending';
  active: boolean;
  verificationEmailOpenedAt: string | null;
};

type LoadState = {
  emails: string[];
  recipients: Recipient[];
  resendConfigured: boolean;
  verificationEmailSubject?: string;
};

export default function PrivateDiningCommunicationsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [resendConfigured, setResendConfigured] = useState(false);
  const [togglingEmail, setTogglingEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [verificationEmailSubject, setVerificationEmailSubject] = useState(
    "Confirm your email — Monaghan's private dining notifications"
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/private-dining-notifications');
      const data = (await res.json()) as LoadState & { error?: string; details?: string };
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Failed to load', res.status));
      }
      setRecipients(data.recipients);
      setResendConfigured(data.resendConfigured);
      if (data.verificationEmailSubject) {
        setVerificationEmailSubject(data.verificationEmailSubject);
      }
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
    setRecipients(data.recipients);
    setResendConfigured(data.resendConfigured);
    if (data.verificationEmailSubject) {
      setVerificationEmailSubject(data.verificationEmailSubject);
    }
  };

  const putEmails = async (emails: string[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/private-dining-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const data = (await res.json()) as LoadState & { error?: string; details?: string };
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Failed to save', res.status));
      }
      applyLoadState(data);
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      showToast('Enter an email address', 'error');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      showToast('That doesn’t look like a valid email', 'error');
      return;
    }
    const existing = new Set(recipients.map((r) => r.email));
    if (existing.has(trimmed)) {
      showToast('That address is already on the list', 'error');
      return;
    }
    const emails = [...recipients.map((r) => r.email), trimmed];
    const ok = await putEmails(emails);
    if (ok) {
      setNewEmail('');
      showToast('Added. They’ll get a verification email.', 'success');
    }
  };

  const removeRecipient = async (email: string) => {
    if (
      !window.confirm(
        `Remove ${email} from this list? They will no longer get verification or lead emails until added again.`
      )
    ) {
      return;
    }
    setRemovingEmail(email);
    try {
      const res = await fetch('/api/admin/private-dining-notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as LoadState & { error?: string; details?: string };
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Failed to remove', res.status));
      }
      applyLoadState(data);
      showToast('Recipient removed', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove', 'error');
    } finally {
      setRemovingEmail(null);
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
      const data = (await res.json()) as LoadState & { error?: string; details?: string };
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Failed to update', res.status));
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
    <div className="rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-sm dark:border-amber-900/40 dark:bg-gray-800/90">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Staff email alerts</h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            New leads are emailed to these addresses (not shown on the public site).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {!loading && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                resendConfigured
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
              }`}
            >
              {resendConfigured ? 'Email ready' : 'Email not configured'}
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || saving}
            title="Refresh list"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="sr-only">Refresh</span>
          </button>
        </div>
      </div>

      {!resendConfigured && !loading && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Set <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">RESEND_API_KEY</code> and{' '}
          <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">RESEND_FROM</code> in the server
          environment. See <code className="rounded px-1">.env.example</code>.
        </p>
      )}

      <div className="mt-4 max-w-xl">
        <label htmlFor="pd-new-email" className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Add recipient
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
          <input
            id="pd-new-email"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addRecipient();
              }
            }}
            disabled={loading || saving}
            placeholder="name@restaurant.com"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
          />
          <button
            type="button"
            onClick={() => void addRecipient()}
            disabled={loading || saving}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 sm:min-w-[5.5rem]"
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Each address verifies once from their inbox. Subject line:{' '}
          <span className="font-medium text-gray-600 dark:text-gray-300">{verificationEmailSubject}</span>
        </p>
      </div>

      {!loading && recipients.length === 0 && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No staff recipients yet.</p>
      )}

      {!loading && recipients.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <table className="w-full min-w-[26rem] table-fixed text-left text-sm">
            <colgroup>
              <col className="min-w-0" />
              <col className="w-[10.5rem]" />
              <col className="w-28" />
            </colgroup>
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/80">
              <tr>
                <th className="min-w-0 px-3 py-2.5 text-xs font-semibold uppercase tracking-tight text-gray-700 dark:text-gray-300">
                  Recipient
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-tight text-gray-700 dark:text-gray-300">
                  Alerts
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-tight text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recipients.map((r) => (
                <tr
                  key={r.email}
                  className="bg-white/80 hover:bg-gray-50/90 dark:bg-gray-900/30 dark:hover:bg-gray-900/60"
                >
                  <td className="min-w-0 px-3 py-2.5 align-middle">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="min-w-0 truncate font-medium text-gray-900 dark:text-white"
                        title={r.email}
                      >
                        {r.email}
                      </span>
                      {r.status === 'verified' ? (
                        <span
                          className="inline-flex shrink-0 text-emerald-600 dark:text-emerald-400"
                          title="Verified"
                        >
                          <span className="sr-only">Verified</span>
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2">
                      <span
                        className={`text-xs font-medium tabular-nums ${
                          r.active
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="sr-only">
                        Lead email alerts for {r.email}: {r.active ? 'on' : 'off'}. Toggle to change.
                      </span>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={r.active}
                        disabled={togglingEmail === r.email || removingEmail === r.email}
                        onChange={(e) => void toggleEmailAlerts(r.email, e.target.checked)}
                      />
                      <span
                        aria-hidden
                        className="relative inline-block h-6 w-11 shrink-0 rounded-full bg-gray-300 shadow-inner transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:ring-1 after:ring-black/5 after:transition-transform after:duration-200 after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600 dark:peer-checked:bg-emerald-500 dark:peer-focus-visible:outline-emerald-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:bg-gray-600 dark:after:ring-white/10"
                      />
                    </label>
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle">
                    <button
                      type="button"
                      onClick={() => void removeRecipient(r.email)}
                      disabled={
                        loading || saving || togglingEmail === r.email || removingEmail === r.email
                      }
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      {removingEmail === r.email ? 'Removing…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pending.length > 0 && (
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-200/90">
          {pending.length} address{pending.length !== 1 ? 'es' : ''} still need to verify from their inbox.
        </p>
      )}
    </div>
  );
}
