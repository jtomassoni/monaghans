import { prisma } from '@/lib/prisma';

export const ORDERING_REDIRECT_SLUGS = ['order-on-fb', 'online-ordering'] as const;
export type OrderingRedirectSlug = (typeof ORDERING_REDIRECT_SLUGS)[number];

/** Public marketing paths (no trailing slash) */
export const ORDERING_REDIRECT_PATHS: Record<OrderingRedirectSlug, string> = {
  'order-on-fb': '/order-on-fb',
  'online-ordering': '/online-ordering',
};

const SETTINGS_KEY = 'ordering_redirect_clicks';

/** { "2025-06-03": { "order-on-fb": { "total": 4 }, "online-ordering": { "total": 9 } } } */
export type OrderingRedirectClickStore = Record<
  string,
  Record<string, { total: number }>
>;

export async function recordOrderingRedirectClick(slug: OrderingRedirectSlug): Promise<void> {
  const date = new Date().toISOString().split('T')[0];

  const existing = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
  });

  let store: OrderingRedirectClickStore = {};
  if (existing) {
    try {
      store = JSON.parse(existing.value) as OrderingRedirectClickStore;
    } catch {
      store = {};
    }
  }

  if (!store[date]) {
    store[date] = {};
  }
  if (!store[date][slug]) {
    store[date][slug] = { total: 0 };
  }

  store[date][slug].total += 1;

  const value = JSON.stringify(store);

  if (existing) {
    await prisma.setting.update({
      where: { key: SETTINGS_KEY },
      data: { value, updatedAt: new Date() },
    });
  } else {
    await prisma.setting.create({
      data: {
        key: SETTINGS_KEY,
        value,
        description: 'Tracked clicks on Grubhub marketing redirect links (slug + date)',
      },
    });
  }
}

export function aggregateOrderingRedirectClicks(
  store: OrderingRedirectClickStore,
  periodDays: number
): {
  period: number;
  summary: {
    totalClicks: number;
    bySlug: Record<string, number>;
  };
  trends: { daily: Array<{ date: string; count: number }> };
  slugBreakdown: Array<{ slug: string; total: number }>;
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  const startKey = startDate.toISOString().split('T')[0];

  const bySlug: Record<string, number> = {};
  const dailyTotals: Record<string, number> = {};

  for (const [date, slugs] of Object.entries(store)) {
    if (date < startKey) continue;

    for (const [slug, counts] of Object.entries(slugs)) {
      const total = typeof counts.total === 'number' ? counts.total : 0;
      bySlug[slug] = (bySlug[slug] || 0) + total;
      dailyTotals[date] = (dailyTotals[date] || 0) + total;
    }
  }

  const totalClicks = Object.values(bySlug).reduce((sum, n) => sum + n, 0);

  const daily = Object.entries(dailyTotals)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const slugBreakdown = ORDERING_REDIRECT_SLUGS.map((slug) => ({
    slug,
    total: bySlug[slug] || 0,
  }));

  return {
    period: periodDays,
    summary: { totalClicks, bySlug },
    trends: { daily },
    slugBreakdown,
  };
}

export async function getOrderingRedirectAnalytics(periodDays: number) {
  const setting = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
  });

  let store: OrderingRedirectClickStore = {};
  if (setting) {
    try {
      store = JSON.parse(setting.value) as OrderingRedirectClickStore;
    } catch {
      store = {};
    }
  }

  return aggregateOrderingRedirectClicks(store, periodDays);
}
