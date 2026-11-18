'use client';

import { FormEvent, useState } from 'react';
import { showToast } from '@/components/toast';

export default function FacebookPageForm({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);

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

  return (
    <form onSubmit={save} className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="facebook-page-url">
        Public Facebook page
      </label>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Paste the page URL. The hourly check reads this public page for food specials and Broncos pot lucks. This is separate from Social Media.
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
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save page'}
      </button>
    </form>
  );
}
