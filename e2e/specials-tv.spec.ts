import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';
import { TestDataTracker } from './test-helpers';

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
  includeWelcome: true, // Welcome slide is enabled by default
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

async function createSpecial(page: any, data: any, tracker?: TestDataTracker) {
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
  const result = await res.json();
  // Track the created special for cleanup
  if (tracker && result.id) {
    tracker.trackSpecial(result.id);
  }
  return result;
}

test.describe('Specials TV', () => {
  // These tests modify shared signage config; keep them serial to avoid races.
  test.describe.configure({ mode: 'serial' });
  
  // Set viewport to 4K for TV display tests (3840x2160)
  test.use({ viewport: { width: 3840, height: 2160 } });

  // Track test data for cleanup
  let tracker: TestDataTracker;

  test.beforeEach(() => {
    // Use empty prefix since we track by ID, but also add prefixes for title-based cleanup
    tracker = new TestDataTracker('.auth/admin.json', '');
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('renders drink + food slides for today', async ({ page }) => {
    const drinkTitle = uniqueTitle('Drink TV');
    const foodTitle = uniqueTitle('Food TV');

    await setSignageConfig(page, {
      includeEvents: false,
      includeHappyHour: false, // Disable happy hour to ensure only drink and food slides
      includeWelcome: false, // Disable welcome slide to see specials immediately
      slideDurationSec: 4,
      fadeDurationSec: 0.3,
      customSlides: [],
    });

    // Create specials that are active today - set appliesOn to today's weekday
    const today = new Date();
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    await createSpecial(page, { 
      title: drinkTitle, 
      type: 'drink', 
      priceNotes: '$6',
      appliesOn: [todayName], // Set to today's weekday so it shows
    }, tracker);
    await createSpecial(page, { 
      title: foodTitle, 
      type: 'food', 
      priceNotes: '$12',
      appliesOn: [todayName], // Set to today's weekday so it shows
    }, tracker);

    await page.goto('/specials-tv?slideDurationSeconds=4&fadeDurationSeconds=0.3');
    await page.waitForLoadState('networkidle');
    
    // Wait for slides to render - wait for either drink or food title to appear
    // Wait longer since slides might cycle through welcome first
    await Promise.race([
      page.waitForSelector(`text=${drinkTitle}`, { state: 'visible', timeout: 12000 }).catch(() => null),
      page.waitForSelector(`text=${foodTitle}`, { state: 'visible', timeout: 12000 }).catch(() => null),
    ]);

    // Slide 1: drink specials (or food, depending on order)
    // Check which one is visible - wait a bit for slide to fully render
    await page.waitForTimeout(1000);
    const drinkVisible = await page.getByText(drinkTitle, { exact: false }).isVisible({ timeout: 3000 }).catch(() => false);
    const foodVisible = await page.getByText(foodTitle, { exact: false }).isVisible({ timeout: 3000 }).catch(() => false);
    
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
      await page.waitForTimeout(1000); // Wait for slide transition
      
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
      includeCustomSlides: true, // Explicitly enable custom slides
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

    await createSpecial(page, { title: foodTitle, type: 'food', priceNotes: '$9' }, tracker);

    await page.goto('/specials-tv?slideDurationSeconds=4&fadeDurationSeconds=0.3');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for slides to initialize
    await page.waitForTimeout(2000);

    // No happy hour slides should render
    await expect(page.locator('text=Happy Hour')).toHaveCount(0);

    // Food slide visible - wait for it to appear (might need to cycle through slides)
    await expect(page.getByText(foodTitle, { exact: false })).toBeVisible({ timeout: 12000 });

    // Custom slide reachable - wait for dots to appear and check count
    const dots = page.getByRole('button', { name: /Go to slide/i });
    await dots.first().waitFor({ state: 'visible', timeout: 5000 });
    const dotCount = await dots.count();
    // Should have at least 2 dots (food special + custom slide), but might have more
    expect(dotCount).toBeGreaterThanOrEqual(2);
    
    // Find which dot corresponds to the custom slide by clicking through them
    // The custom slide is at position 2, but slides might be in different order
    let customSlideFound = false;
    const slideDuration = 4000; // From test params: slideDurationSeconds=4
    
    // Try clicking each dot to find the custom slide
    for (let i = 0; i < dotCount; i++) {
      const dot = dots.nth(i);
      await dot.click();
      // Wait for transition (fade 0.3s + buffer) and slide to settle
      await page.waitForTimeout(1000);
      
      // Check if custom slide is visible
      try {
        await expect(page.getByText(customTitle, { exact: false })).toBeVisible({ timeout: 2000 });
        customSlideFound = true;
        break;
      } catch {
        // Not this slide, continue to next
        continue;
      }
    }
    
    // If still not found, wait for slides to rotate naturally
    if (!customSlideFound) {
      // Wait for a full rotation cycle (slideDuration * dotCount)
      const rotationCycle = slideDuration * dotCount;
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(rotationCycle + 1000);
        try {
          await expect(page.getByText(customTitle, { exact: false })).toBeVisible({ timeout: 2000 });
          customSlideFound = true;
          break;
        } catch {
          continue;
        }
      }
    }
    
    if (!customSlideFound) {
      // Get current slide content for debugging
      const pageContent = await page.textContent('body').catch(() => 'unable to get content');
      throw new Error(
        `Custom slide with title "${customTitle}" not found after multiple attempts.\n` +
        `Total dots: ${dotCount}\n` +
        `Page content preview: ${pageContent?.substring(0, 200)}`
      );
    }
  });

  test('falls back when all sources are disabled', async ({ page }) => {
    await setSignageConfig(page, {
      includeFoodSpecials: false,
      includeDrinkSpecials: false,
      includeHappyHour: false,
      includeEvents: false,
      includeWelcome: false, // Disable welcome slide so fallback shows
      customSlides: [],
    });

    await page.goto('/specials-tv?slideDurationSeconds=4&fadeDurationSeconds=0.3');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the specials-tv page
    await expect(page).toHaveURL(/\/specials-tv/);
    
    // Wait for the slide container to be visible (signage rotator renders slides)
    // The page has a fixed inset-0 container with bg-[#050608]
    await page.waitForSelector('div[class*="fixed"][class*="inset-0"]', { timeout: 5000 }).catch(() => {});
    
    // Wait for slides to render and cycle
    await page.waitForTimeout(3000);

    // Fallback slide text should be present - check for title, body, or footer text
    // The fallback slide has:
    // - title: "Ask your bartender"
    // - body: "If you are seeing this, CMS data is unavailable. We will refresh automatically."
    // - footer: "Content refreshes in real time"
    // With 4K viewport, text should be visible but may need to wait for slide rotation
    const fallbackTexts = [
      'Ask your bartender',
      'CMS data is unavailable',
      'Content refreshes in real time',
      'We will refresh automatically',
      'If you are seeing this'
    ];
    
    let foundText = false;
    // Wait up to 20 seconds for the fallback slide to appear (slides rotate every 4 seconds)
    // Check multiple times as slides cycle
    for (let i = 0; i < 40; i++) {
      // Check all texts - use locator with better matching
      for (const text of fallbackTexts) {
        // Try multiple selector strategies
        const selectors = [
          page.getByText(text, { exact: false }),
          page.locator(`text=/${text}/i`),
          page.locator(`*:has-text("${text}")`),
        ];
        
        for (const selector of selectors) {
          const visible = await selector.isVisible({ timeout: 300 }).catch(() => false);
          if (visible) {
            foundText = true;
            break;
          }
        }
        
        if (foundText) break;
      }
      
      if (foundText) break;
      await page.waitForTimeout(500); // Wait before next check
    }
    
    expect(foundText).toBeTruthy();
  });
});

