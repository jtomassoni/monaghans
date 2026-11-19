'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import { isLoggedPageCode, readablePollExcerpt, readablePollSummary, type FacebookSpecialPollResult } from '@/lib/facebook-special-poll';

interface PollView {
  id: string;
  ranAt: string;
  ok: boolean;
  summary: string;
  results: FacebookSpecialPollResult[];
}

const OUTCOMES: Record<string, string> = {
  emailed: 'Emailed',
  waiting: 'Waiting until 7 AM',
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

function outcomeTone(outcome: string): string {
  if (outcome === 'food' || outcome === 'emailed') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
  }
  if (outcome === 'waiting') {
    return 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100';
  }
  if (outcome === 'football') {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100';
  }
  if (outcome === 'error' || outcome === 'email-failed') {
    return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
  }
  return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
}

export default function FacebookSpecialsPanel({
  initialUrl,
  loginSavedAt,
  days,
  timeZone,
  notice,
}: {
  initialUrl: string;
  loginSavedAt: string | null;
  days: { date: string; label: string; polls: PollView[] }[];
  timeZone: string;
  notice: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [cookie, setCookie] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [openDays, setOpenDays] = useState<string[]>(() => (days[0] ? [days[0].date] : []));
  const [openChecks, setOpenChecks] = useState<string[]>(() => (days[0]?.polls[0] ? [days[0].polls[0].id] : []));
  const [openPosts, setOpenPosts] = useState<string[]>([]);
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

  async function saveLogin(event: FormEvent) {
    event.preventDefault();
    setSavingLogin(true);
    try {
      const response = await fetch('/api/facebook-specials/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('Could not save the Facebook login', 'error', data.error || 'Try again.');
        return;
      }
      setCookie('');
      showToast('Facebook login saved', 'success');
      router.refresh();
    } catch {
      showToast('Could not save the Facebook login', 'error', 'Try again.');
    } finally {
      setSavingLogin(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Remove this Facebook login?')) return;
    setDisconnecting(true);
    try {
      const response = await fetch('/api/facebook-specials/visitor', { method: 'DELETE' });
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
      <form onSubmit={saveLogin} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Facebook login</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The hourly check opens the page the same way your browser does. Paste the cookie from a facebook.com request while you are logged in. It stays on the server and is only used to read this page.
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          In Chrome, open Facebook, then View, Developer, Developer Tools, Network. Reload, click the first facebook.com request, and copy the request header named cookie.
        </p>
        {loginSavedAt ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-900 dark:text-white">
              Login saved {dayStamp.format(new Date(loginSavedAt))}.
            </p>
            <button
              type="button"
              onClick={disconnect}
              disabled={disconnecting}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200"
            >
              {disconnecting ? 'Removing…' : 'Remove login'}
            </button>
          </div>
        ) : null}
        <textarea
          value={cookie}
          onChange={(event) => setCookie(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          rows={4}
          placeholder="c_user=...; xs=..."
          className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={savingLogin || cookie.trim().length === 0}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {savingLogin ? 'Saving…' : 'Save login'}
        </button>
      </form>

      <form onSubmit={save} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="facebook-page-url">
          Public Facebook page
        </label>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste the page URL. Scan the last 24 hours to see each post’s content type. The scan does not send email or add specials. The hourly check still runs overnight, and approval emails go out from 7:00 AM to 7:00 PM.
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
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Open a check, then open any post for the full text. Expand posts opens every post in that check.
        </p>
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
                <div className="space-y-3 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                  {day.polls.map((poll) => {
                    const checkOpen = openChecks.includes(poll.id);
                    const posts = poll.results.filter((result) => !isLoggedPageCode(result));
                    const hiddenPageCodes = poll.results.length - posts.length;
                    const postKeys = posts.map((_, index) => `${poll.id}-${index}`);
                    const allPostsOpen = postKeys.length > 0 && postKeys.every((key) => openPosts.includes(key));
                    return (
                      <article key={poll.id} className="flex gap-3">
                        <time
                          dateTime={poll.ranAt}
                          className="w-16 shrink-0 pt-2 text-sm font-semibold tabular-nums text-gray-900 dark:text-white"
                        >
                          {clock.format(new Date(poll.ranAt))}
                        </time>
                        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                            <button
                              type="button"
                              aria-expanded={checkOpen}
                              onClick={() => setOpenChecks((current) => (
                                current.includes(poll.id)
                                  ? current.filter((id) => id !== poll.id)
                                  : [...current, poll.id]
                              ))}
                              className={`min-w-0 flex-1 text-left text-sm leading-snug break-words ${poll.ok ? 'text-gray-900 dark:text-gray-100' : 'text-red-700 dark:text-red-300'}`}
                            >
                              <span className="mr-1.5 text-gray-400" aria-hidden="true">{checkOpen ? '▾' : '▸'}</span>
                              {readablePollSummary(poll.summary, hiddenPageCodes)}
                            </button>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                poll.ok
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                              }`}
                            >
                              {poll.ok ? 'OK' : 'Problem'}
                            </span>
                            {postKeys.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setOpenPosts((current) => (
                                  allPostsOpen
                                    ? current.filter((key) => !postKeys.includes(key))
                                    : [...new Set([...current, ...postKeys])]
                                ))}
                                className="shrink-0 text-xs font-medium text-gray-600 underline dark:text-gray-300"
                              >
                                {allPostsOpen ? 'Collapse posts' : 'Expand posts'}
                              </button>
                            )}
                          </div>
                          {checkOpen && posts.length > 0 && (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                              {posts.map((result, index) => {
                                const key = `${poll.id}-${index}`;
                                const postOpen = openPosts.includes(key);
                                const full = readablePollExcerpt(result.message || result.excerpt);
                                const line = readablePollExcerpt(result.excerpt);
                                return (
                                  <li key={key}>
                                    <button
                                      type="button"
                                      aria-expanded={postOpen}
                                      onClick={() => setOpenPosts((current) => (
                                        current.includes(key)
                                          ? current.filter((item) => item !== key)
                                          : [...current, key]
                                      ))}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left"
                                    >
                                      <span className="text-gray-400" aria-hidden="true">{postOpen ? '▾' : '▸'}</span>
                                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${outcomeTone(result.outcome)}`}>
                                        {OUTCOMES[result.outcome] || 'Result'}
                                      </span>
                                      <span className={`min-w-0 flex-1 truncate text-sm ${line.pageCode ? 'italic text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                        {line.text || result.detail}
                                      </span>
                                    </button>
                                    {postOpen && (
                                      <div className="space-y-2 px-9 pb-3">
                                        {full.text ? (
                                          <p className={`whitespace-pre-wrap text-sm leading-relaxed break-words ${full.pageCode ? 'italic text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                            {full.text}
                                          </p>
                                        ) : null}
                                        <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">{result.detail}</p>
                                        {result.permalink && (
                                          <a
                                            href={result.permalink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-block text-xs font-medium text-red-700 underline dark:text-red-300"
                                          >
                                            Open post
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
