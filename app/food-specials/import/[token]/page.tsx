import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { footballOpponentDefault, loadFoodSpecialImport } from '@/lib/facebook-food-special-import';
import { getCompanyTimezone, getCompanyTimezoneDateString } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Add food special',
  robots: { index: false, follow: false },
};

function dayLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default async function FacebookFoodSpecialImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const query = await searchParams;
  const row = await loadFoodSpecialImport(token);
  if (!row) notFound();

  const timezone = await getCompanyTimezone();
  const football = row.kind === 'football';
  const kickoffMatch = row.priceNotes?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  const gameDate = kickoffMatch?.[1] || getCompanyTimezoneDateString(row.postedAt, timezone);
  const gameTime = kickoffMatch?.[2] || '14:00';
  const day = football
    ? dayLabel(new Date(`${gameDate}T12:00:00Z`), 'UTC')
    : dayLabel(row.postedAt, timezone);
  const dateStr = football ? gameDate : getCompanyTimezoneDateString(row.postedAt, timezone);

  return (
    <main id="main-content" className="min-h-screen bg-black text-white px-4 py-16">
      <div className="max-w-xl mx-auto">
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4af37] mb-3">Monaghan&apos;s</p>
        <h1 className="text-3xl font-bold mb-2">
          {football ? `Football game for ${day}` : `Food special for ${day}`}
        </h1>
        <p className="text-gray-400 mb-8">
          {football
            ? `Pulled from the Facebook post. This adds a Broncos pot luck for ${dateStr}, on the site and the TVs.`
            : `Pulled from the Facebook post. This adds it for ${dateStr} only, on the site, the menu, and the TVs.`}
        </p>

        {query.error ? (
          <p className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-red-100">
            {query.error}
          </p>
        ) : null}

        {row.status === 'applied' ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-lg font-semibold mb-2">
              {row.title} is {football ? 'on the schedule' : 'on the menu'}.
            </p>
            <p className="text-gray-400 mb-4">Nothing else to do for this post.</p>
            <Link href="/" className="text-[#d4af37] underline">
              View the site
            </Link>
          </div>
        ) : row.status === 'dismissed' ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-lg font-semibold">Skipped.</p>
            <p className="text-gray-400 mt-2">This post will not be added, and you will not be emailed about it again.</p>
          </div>
        ) : (
          <form method="POST" action="/api/food-specials/facebook-import" className="space-y-5">
            <input type="hidden" name="token" value={token} />
            {row.imageUrl ? (
              // Facebook CDN photos are temporary and not in the local image allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.imageUrl}
                alt=""
                className="w-full max-h-64 object-cover rounded-2xl border border-white/10"
              />
            ) : null}
            {football ? (
              <>
                <label className="block">
                  <span className="block text-sm text-gray-300 mb-1">Opponent</span>
                  <input
                    name="title"
                    defaultValue={footballOpponentDefault(row.title)}
                    required
                    maxLength={120}
                    placeholder="Chiefs"
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-gray-300 mb-1">House meal for the pot luck</span>
                  <input
                    name="description"
                    defaultValue={row.description || ''}
                    required
                    maxLength={80}
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-sm text-gray-300 mb-1">Game day</span>
                    <input
                      type="date"
                      name="gameDate"
                      defaultValue={gameDate}
                      required
                      className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm text-gray-300 mb-1">Kickoff</span>
                    <select
                      name="kickoffTime"
                      defaultValue={gameTime}
                      className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white"
                    >
                      <option value="11:00">11:00 AM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="18:00">6:00 PM</option>
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="block text-sm text-gray-300 mb-1">Name</span>
                  <input
                    name="title"
                    defaultValue={row.title}
                    required
                    maxLength={120}
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-gray-300 mb-1">Description</span>
                  <textarea
                    name="description"
                    defaultValue={row.description || ''}
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-gray-300 mb-1">Price</span>
                  <input
                    name="priceNotes"
                    defaultValue={row.priceNotes || ''}
                    maxLength={80}
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white"
                  />
                </label>
              </>
            )}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Original post</p>
              <p className="whitespace-pre-wrap text-sm text-gray-300">{row.rawMessage}</p>
              {row.permalink ? (
                <a href={row.permalink} className="inline-block mt-3 text-sm text-[#d4af37] underline">
                  View on Facebook
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                name="intent"
                value="apply"
                className="rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] px-5 py-3 font-semibold"
              >
                {football ? 'Add this football game' : 'Add this food special'}
              </button>
              <button
                type="submit"
                name="intent"
                value="dismiss"
                className="rounded-xl border border-white/20 px-5 py-3 text-gray-300"
              >
                {football ? 'Not a football game' : 'Not a food special'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
