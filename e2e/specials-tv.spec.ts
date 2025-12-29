import { test, expect } from '@playwright/test';

const defaultConfig = {
  includeFoodSpecials: true,
  includeDrinkSpecials: true,
  includeHappyHour: true,
  includeEvents: false,
  eventsTileCount: 4,
  slideDurationSec: 5,
  fadeDurationSec: 0.5,
  customSlides: [] as any[],
};

const uniqueTitle = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function setSignageConfig(page: any, overrides: Partial<typeof defaultConfig> = {}) {
  const payload = { ...defaultConfig, ...overrides };
  const res = await page.request.post('/api/signage-config', { data: payload });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function createSpecial(page: any, data: any) {
  const res = await page.request.post('/api/specials', {
    data: {
      title: data.title,
      description: data.description || '',
      priceNotes: data.priceNotes || '',
      type: data.type || 'food',
      appliesOn: data.appliesOn ?? [],
      timeWindow: data.timeWindow,
      startDate: data.startDate,
      endDate: data.endDate,
      image: data.image,
      isActive: data.isActive ?? true,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test.describe('Specials TV', () => {
  // These tests modify shared signage config; keep them serial to avoid races.
  test.describe.configure({ mode: 'serial' });

  test('renders drink + food slides for today', async ({ page }) => {
    const drinkTitle = uniqueTitle('Drink TV');
    const foodTitle = uniqueTitle('Food TV');

    await setSignageConfig(page, {
      includeEvents: false,
      slideDurationSec: 4,
      fadeDurationSec: 0.3,
      customSlides: [],
    });

    await createSpecial(page, { title: drinkTitle, type: 'drink', priceNotes: '$6' });
    await createSpecial(page, { title: foodTitle, type: 'food', priceNotes: '$12' });

    await page.goto('/specials-tv?slideDurationSeconds=4&fadeDurationSeconds=0.3');

    // Slide 1: happy hour with drink specials
    await expect(page.getByText(drinkTitle, { exact: false })).toBeVisible({ timeout: 8000 });

    // Navigate to food slide via dots
    const dots = page.getByRole('button', { name: /Go to slide/i });
    await expect(dots).toHaveCount(2);
    await dots.nth(1).click();
    await expect(page.getByText(foodTitle, { exact: false })).toBeVisible({ timeout: 8000 });
  });

  test('respects signage toggles and custom slides', async ({ page }) => {
    const foodTitle = uniqueTitle('Food Only');
    const customTitle = uniqueTitle('Custom Slide');

    await setSignageConfig(page, {
      includeHappyHour: false,
      includeDrinkSpecials: false,
      includeEvents: false,
      slideDurationSec: 4,
      fadeDurationSec: 0.3,
      customSlides: [
        {
          id: `custom-${Date.now()}`,
          label: 'Promo',
          title: customTitle,
          subtitle: 'TV only',
          body: 'Custom signage body',
          accent: 'blue',
          position: 2,
          isEnabled: true,
        },
      ],
    });

    await createSpecial(page, { title: foodTitle, type: 'food', priceNotes: '$9' });

    await page.goto('/specials-tv?slideDurationSeconds=4&fadeDurationSeconds=0.3');

    // No happy hour slides should render
    await expect(page.locator('text=Happy Hour')).toHaveCount(0);

    // Food slide visible
    await expect(page.getByText(foodTitle, { exact: false })).toBeVisible({ timeout: 8000 });

    // Custom slide reachable
    const dots = page.getByRole('button', { name: /Go to slide/i });
    await expect(dots).toHaveCount(2);
    await dots.nth(1).click();
    await expect(page.getByText(customTitle, { exact: false })).toBeVisible({ timeout: 8000 });
  });

  test('falls back when all sources are disabled', async ({ page }) => {
    await setSignageConfig(page, {
      includeFoodSpecials: false,
      includeDrinkSpecials: false,
      includeHappyHour: false,
      includeEvents: false,
      customSlides: [],
    });

    await page.goto('/specials-tv?slideDurationSeconds=4&fadeDurationSeconds=0.3');

    // Fallback slide text should be present
    await expect(page.getByText('Ask your bartender')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Content refreshes in real time')).toBeVisible();
  });
});

