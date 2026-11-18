'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import type { FacebookSpecialPollResult } from '@/lib/facebook-special-poll';

interface PollView {
  id: string;
  ranAt: string;
  ok: boolean;
  summary: string;
  results: FacebookSpecialPollResult[];
}

const OUTCOMES: Record<string, string> = {
  emailed: 'Emailed',
  'already-seen': 'Already reviewed',
  'not-a-special': 'Not a special',
  'too-old': 'Too old',
  'posted-by-site': 'Posted by this site',
  empty: 'Nothing to read',
  'image-limit': 'Photo limit',
  'email-failed': 'Email failed',
  duplicate: 'Duplicate',
  error: 'Problem',
  food: 'Food special',
  football: 'Football game',
};

export default function FacebookSpecialsPanel({
  initialUrl,
  account,
  days,
  timeZone,
  notice,
}: {
  initialUrl: string;
  account: { name: string; expiresAt: string | null } | null;
  days: { date: string; label: string; polls: PollView[] }[];
  timeZone: string;
  notice: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [openDays, setOpenDays] = useState<string[]>(() => (days[0] ? [days[0].date] : []));
  const announced = useRef(false);
  const clock = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
  const dayStamp = new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    if (!notice || announced.current) return;
    announced.current = true;
    if (notice === 'connected') showToast('Facebook account connected', 'success');
    else showToast('Facebook login did not finish', 'error', notice);
    router.replace('/admin/facebook-specials');
  }, [notice, router]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/facebook-public-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('Could not save the page', 'error', data.error || 'Try the public Facebook URL again.');
        return;
      }
      setUrl(data.url || '');
      showToast(data.url ? 'Facebook page saved' : 'Facebook page cleared', 'success');
    } catch {
      showToast('Could not save the page', 'error', 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function connect() {
    setConnecting(true);
    try {
      const response = await fetch('/api/facebook-specials/connect', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.authUrl) {
        showToast('Could not start Facebook login', 'error', data.error || 'Try again.');
        setConnecting(false);
        return;
      }
      window.location.href = data.authUrl;
    } catch {
      showToast('Could not start Facebook login', 'error', 'Try again.');
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect this Facebook account?')) return;
    setDisconnecting(true);
    try {
      const response = await fetch('/api/facebook-specials/disconnect', { method: 'DELETE' });
      if (!response.ok) {
        showToast('Could not disconnect Facebook', 'error', 'Try again.');
        return;
      }
      showToast('Facebook account disconnected', 'success');
      router.refresh();
    } catch {
      showToast('Could not disconnect Facebook', 'error', 'Try again.');
    } finally {
      setDisconnecting(false);
    }
  }

  async function scanLastDay() {
    setScanning(true);
    try {
      const response = await fetch('/api/facebook-specials/scan', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('Scan failed', 'error', data.error || 'Try again.');
        return;
      }
      showToast(data.ok ? 'Scan finished' : 'Scan finished with a problem', data.ok ? 'success' : 'error', data.summary);
      router.refresh();
    } catch {
      showToast('Scan failed', 'error', 'Try again.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Facebook account</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sign in with a normal Facebook account. The hourly check uses that login to read this page.
        </p>
        {account ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-900 dark:text-white">
              Connected as {account.name}.
              {account.expiresAt ? ` Login lasts until ${dayStamp.format(new Date(account.expiresAt))}.` : ''}
            </p>
            <button
              type="button"
              onClick={disconnect}
              disabled={disconnecting}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={connecting}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {connecting ? 'Opening Facebook…' : 'Connect Facebook'}
          </button>
        )}
      </section>

      <form onSubmit={save} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="facebook-page-url">
          Public Facebook page
        </label>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste the page URL. Scan the last 24 hours to see each post’s content type. The scan does not send email or add specials.
        </p>
        <input
          id="facebook-page-url"
          type="url"
          inputMode="url"
          placeholder="https://www.facebook.com/your-page"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save page'}
          </button>
          <button
            type="button"
            onClick={scanLastDay}
            disabled={scanning}
            className="rounded-xl border border-gray-300 px-4 py-2 font-semibold text-gray-700 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200"
          >
            {scanning ? 'Scanning…' : 'Scan last 24 hours'}
          </button>
        </div>
      </form>

      <section>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Check history</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Each check is listed under its day.</p>
        {days.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            No checks yet. Scan the last 24 hours, or wait for the next hourly check.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {days.map((day) => (
              <details
                key={day.date}
                open={openDays.includes(day.date)}
                onToggle={(event) => {
                  const open = event.currentTarget.open;
                  setOpenDays((current) => {
                    const has = current.includes(day.date);
                    if (open === has) return current;
                    return open ? [...current, day.date] : current.filter((item) => item !== day.date);
                  });
                }}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-white">
                  {day.label}
                  <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                    {day.polls.length === 1 ? '1 check' : `${day.polls.length} checks`}
                  </span>
                </summary>
                <div className="space-y-4 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                  {day.polls.map((poll) => (
                    <article key={poll.id}>
                      <p className={`text-sm ${poll.ok ? 'text-gray-900 dark:text-white' : 'text-red-700 dark:text-red-300'}`}>
                        <span className="font-medium">{clock.format(new Date(poll.ranAt))}</span>
                        {' '}
                        {poll.summary}
                      </p>
                      {poll.results.length > 0 && (
                        <ul className="mt-2 space-y-2">
                          {poll.results.map((result, index) => (
                            <li key={`${poll.id}-${result.postId}-${index}`} className="text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-medium text-gray-800 dark:text-gray-100">
                                {OUTCOMES[result.outcome] || 'Result'}
                              </span>
                              {result.excerpt ? ` — ${result.excerpt}` : ''}
                              <span className="block text-gray-500 dark:text-gray-400">{result.detail}</span>
                              {result.permalink && (
                                <a
                                  href={result.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-red-700 underline dark:text-red-300"
                                >
                                  Open post
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
