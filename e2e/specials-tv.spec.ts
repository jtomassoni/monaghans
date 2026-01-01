import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'specials-tv',
  featureArea: 'content',
  description: 'Specials TV display and signage',
};

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
      includeHappyHour: false, // Disable happy hour to ensure only drink and food slides
      slideDurationSec: 4,
      fadeDurationSec: 0.3,
      customSlides: [],
    });

    await createSpecial(page, { title: drinkTitle, type: 'drink', priceNotes: '$6' });
    await createSpecial(page, { title: foodTitle, type: 'food', priceNotes: '$12' });

    await page.goto('/specials-tv?slideDurationSeconds=4&fadeDurationSeconds=0.3');
    await page.waitForLoadState('networkidle');
    
    // Wait for slides to render - wait for either drink or food title to appear
    await Promise.race([
      page.waitForSelector(`text=${drinkTitle}`, { state: 'visible', timeout: 8000 }).catch(() => null),
      page.waitForSelector(`text=${foodTitle}`, { state: 'visible', timeout: 8000 }).catch(() => null),
    ]);

    // Slide 1: drink specials (or food, depending on order)
    // Check which one is visible
    const drinkVisible = await page.getByText(drinkTitle, { exact: false }).isVisible({ timeout: 2000 }).catch(() => false);
    const foodVisible = await page.getByText(foodTitle, { exact: false }).isVisible({ timeout: 2000 }).catch(() => false);
    
    // At least one should be visible
    expect(drinkVisible || foodVisible).toBeTruthy();

    // Navigate to other slide via dots - there should be at least 2 slides (drink and food)
    const dots = page.getByRole('button', { name: /Go to slide/i });
    await dots.first().waitFor({ state: 'visible', timeout: 5000 });
    const dotCount = await dots.count();
    expect(dotCount).toBeGreaterThanOrEqual(2);
    
    // Click the second dot to navigate to the other slide
    if (dotCount >= 2) {
      await dots.nth(1).click();
      
      // Wait for slide transition - wait for the other title to appear
      if (drinkVisible) {
        await expect(page.getByText(foodTitle, { exact: false })).toBeVisible({ timeout: 8000 });
      } else {
        await expect(page.getByText(drinkTitle, { exact: false })).toBeVisible({ timeout: 8000 });
      }
    }
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

    // Custom slide reachable - wait for dots to appear and check count
    const dots = page.getByRole('button', { name: /Go to slide/i });
    await dots.first().waitFor({ state: 'visible', timeout: 5000 });
    const dotCount = await dots.count();
    // Should have at least 2 dots (food special + custom slide), but might have more
    expect(dotCount).toBeGreaterThanOrEqual(2);
    // Click the last dot to go to custom slide
    await dots.nth(dotCount - 1).click();
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

