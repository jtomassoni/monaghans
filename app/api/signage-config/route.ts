import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentUser, handleError, logActivity } from '@/lib/api-helpers';

type SignageItem = {
  title: string;
  note?: string;
  time?: string;
  detail?: string;
};

type SignageSlide = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  body?: string;
  accent?: 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan';
  footer?: string;
  position?: number;
  isEnabled?: boolean;
};

type SignageConfig = {
  includeFoodSpecials: boolean;
  includeDrinkSpecials: boolean;
  includeHappyHour: boolean;
  includeEvents: boolean;
  eventsTileCount: number;
  slideDurationSec: number;
  fadeDurationSec: number;
  customSlides: SignageSlide[];
};

const DEFAULT_CONFIG: SignageConfig = {
  includeFoodSpecials: true,
  includeDrinkSpecials: true,
  includeHappyHour: true,
  includeEvents: true,
  eventsTileCount: 6, // show up to 6 events by default
  slideDurationSec: 10,
  fadeDurationSec: 0.8,
  customSlides: [],
};

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

function sanitizeConfig(payload: any): SignageConfig {
  const base: SignageConfig = { ...DEFAULT_CONFIG };

  if (typeof payload?.includeFoodSpecials === 'boolean') base.includeFoodSpecials = payload.includeFoodSpecials;
  if (typeof payload?.includeDrinkSpecials === 'boolean') base.includeDrinkSpecials = payload.includeDrinkSpecials;
  if (typeof payload?.includeHappyHour === 'boolean') base.includeHappyHour = payload.includeHappyHour;
  if (typeof payload?.includeEvents === 'boolean') base.includeEvents = payload.includeEvents;

  const tiles = (() => {
    if (typeof payload?.eventsTileCount === 'number') return payload.eventsTileCount;
    if (typeof payload?.daysAhead === 'number') return payload.daysAhead; // backward compatibility
    return DEFAULT_CONFIG.eventsTileCount;
  })();
  base.eventsTileCount = clamp(Math.round(tiles), 1, 12);
  if (typeof payload?.slideDurationSec === 'number') base.slideDurationSec = clamp(payload.slideDurationSec, 4, 60);
  if (typeof payload?.fadeDurationSec === 'number') base.fadeDurationSec = clamp(payload.fadeDurationSec, 0.3, 5);

  if (Array.isArray(payload?.customSlides)) {
    base.customSlides = payload.customSlides
      .map((slide: any, idx: number) => {
        if (!slide || typeof slide !== 'object') return null;
        if (!slide.id || !slide.title || !slide.label) return null;

        return {
          id: String(slide.id),
          label: String(slide.label),
          title: String(slide.title),
          subtitle: slide.subtitle ? String(slide.subtitle) : undefined,
          body: slide.body ? String(slide.body) : undefined,
          accent: ['accent', 'gold', 'blue', 'green', 'purple', 'orange', 'teal', 'pink', 'cyan'].includes(slide.accent) ? slide.accent : 'accent',
          footer: slide.footer ? String(slide.footer) : undefined,
          position: typeof slide.position === 'number' ? slide.position : idx + 1,
          isEnabled: slide.isEnabled !== false,
        };
      })
      .filter(Boolean) as SignageSlide[];
  }

  return base;
}

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'signageConfig' },
    });

    if (!setting) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    try {
      const parsed = JSON.parse(setting.value);
      return NextResponse.json(sanitizeConfig(parsed));
    } catch {
      return NextResponse.json(DEFAULT_CONFIG);
    }
  } catch (error) {
    return handleError(error, 'Failed to load signage config');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const config = sanitizeConfig(body);

    const setting = await prisma.setting.upsert({
      where: { key: 'signageConfig' },
      update: { value: JSON.stringify(config) },
      create: {
        key: 'signageConfig',
        value: JSON.stringify(config),
        description: 'Digital signage configuration',
      },
    });

    await logActivity(
      user.id,
      'update',
      'setting',
      setting.id,
      'signageConfig',
      undefined,
      'Updated digital signage configuration'
    );

    return NextResponse.json(config);
  } catch (error) {
    return handleError(error, 'Failed to save signage config');
  }
}

