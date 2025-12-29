import { prisma } from '@/lib/prisma';
import SignageRotator from '@/components/signage-rotator';
import {
  getMountainTimeWeekday,
  getMountainTimeToday,
  getMountainTimeDateString,
  parseMountainTimeDate,
  getMountainTimeNow,
} from '@/lib/timezone';
import { startOfDay, endOfDay, format } from 'date-fns';
import { RRule } from 'rrule';
import { buildSlides } from './slide-builder';
import { SlideContent } from './types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SignageConfig = {
  includeFoodSpecials: boolean;
  includeDrinkSpecials: boolean;
  includeHappyHour: boolean;
  includeEvents: boolean;
  upcomingEventsTileCount: number;
  slideDurationSeconds: number;
  fadeDurationSeconds: number;
  customSlides: any[];
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  hour: 'numeric',
  minute: '2-digit',
});

const DEFAULT_CONFIG: SignageConfig = {
  includeFoodSpecials: true,
  includeDrinkSpecials: true,
  includeHappyHour: true,
  includeEvents: true,
  upcomingEventsTileCount: 6, // show up to 6 upcoming events by default
  slideDurationSeconds: 10,
  fadeDurationSeconds: 0.8,
  customSlides: [],
};

type SearchParamsShape = Record<string, string | string[] | undefined>;

type SpecialsTvPageProps = {
  searchParams?: Promise<SearchParamsShape> | SearchParamsShape;
};

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function sanitizeSignageConfig(value: any): SignageConfig {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const slideDuration = Number(parsed?.slideDurationSeconds ?? parsed?.slideDurationSec ?? DEFAULT_CONFIG.slideDurationSeconds);
    const fadeDuration = Number(parsed?.fadeDurationSeconds ?? parsed?.fadeDurationSec ?? DEFAULT_CONFIG.fadeDurationSeconds);
    const tileCount = Number(
      parsed?.upcomingEventsTileCount ??
        parsed?.eventsTileCount ??
        parsed?.daysAhead ?? // backward compatibility
        DEFAULT_CONFIG.upcomingEventsTileCount
    );

    const cleanCustomSlides = Array.isArray(parsed?.customSlides)
      ? parsed.customSlides.map((slide: any, idx: number) => {
          // Valid accent colors
          const validAccents = ['accent', 'gold', 'blue', 'green', 'purple', 'orange', 'teal', 'pink', 'cyan'];
          const accent = validAccents.includes(slide?.accent) ? slide.accent : 'accent';
          
          return {
            id: slide?.id ?? `custom-${idx}`,
            label: slide?.label ?? 'Custom',
            title: slide?.title ?? 'Custom Slide',
            subtitle: slide?.subtitle ?? '',
            body: slide?.body ?? '',
            footer: slide?.footer ?? '',
            accent,
            position: typeof slide?.position === 'number' ? slide.position : idx + 1,
            isEnabled: slide?.isEnabled !== false,
          };
        })
      : [];

    return {
      includeFoodSpecials: parsed?.includeFoodSpecials ?? DEFAULT_CONFIG.includeFoodSpecials,
      includeDrinkSpecials: parsed?.includeDrinkSpecials ?? DEFAULT_CONFIG.includeDrinkSpecials,
      includeHappyHour: parsed?.includeHappyHour ?? DEFAULT_CONFIG.includeHappyHour,
      includeEvents: parsed?.includeEvents ?? DEFAULT_CONFIG.includeEvents,
      upcomingEventsTileCount: clamp(tileCount || DEFAULT_CONFIG.upcomingEventsTileCount, 1, 12),
      slideDurationSeconds: clamp(slideDuration || DEFAULT_CONFIG.slideDurationSeconds, 4, 60),
      fadeDurationSeconds: clamp(fadeDuration || DEFAULT_CONFIG.fadeDurationSeconds, 0.3, 5),
      customSlides: cleanCustomSlides,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function parseAppliesOn(appliesOn: any): string[] {
  try {
    if (!appliesOn) return [];
    const parsed = typeof appliesOn === 'string' ? JSON.parse(appliesOn) : appliesOn;
    if (!Array.isArray(parsed)) return [];
    // Normalize day names (trim whitespace, ensure proper case) - same as homepage
    return parsed.map(day => String(day).trim()).filter(day => day.length > 0);
  } catch {
    return [];
  }
}

function isSpecialActiveToday(special: any, today: Date, todayName: string): boolean {
  // Parse appliesOn if it exists - same logic as homepage
  let appliesOn: string[] = [];
  try {
    if (special.appliesOn) {
      appliesOn = typeof special.appliesOn === 'string' 
        ? JSON.parse(special.appliesOn) 
        : special.appliesOn;
      if (!Array.isArray(appliesOn)) {
        appliesOn = [];
      }
      // Normalize day names (trim whitespace, ensure proper case)
      appliesOn = appliesOn.map(day => day.trim()).filter(day => day.length > 0);
    }
  } catch {
    // Invalid JSON, skip
    appliesOn = [];
  }

  // Parse dates as Mountain Time dates (not UTC) to prevent day shifts - same as homepage
  let startDateStr: string | null = null;
  let endDateStr: string | null = null;
  
  if (special.startDate) {
    const startDateValue = special.startDate as string | Date;
    startDateStr = typeof startDateValue === 'string' 
      ? startDateValue.split('T')[0] 
      : getMountainTimeDateString(startDateValue);
  }
  
  if (special.endDate) {
    const endDateValue = special.endDate as string | Date;
    endDateStr = typeof endDateValue === 'string' 
      ? endDateValue.split('T')[0] 
      : getMountainTimeDateString(endDateValue);
  }
  
  const startDate = startDateStr ? parseMountainTimeDate(startDateStr) : null;
  const endDate = endDateStr ? parseMountainTimeDate(endDateStr) : null;

  // If weekly recurring days are set - same logic as homepage
  if (appliesOn.length > 0) {
    // Check if today matches a recurring day (case-insensitive comparison)
    const matchesDay = appliesOn.some(day => 
      day.toLowerCase() === todayName.toLowerCase()
    );
    
    if (matchesDay) {
      // Weekly recurring specials: check day match AND date range if set
      let isInDateRange = true;
      
      // Check if we're past the start date (if set) - use Date comparison
      if (startDate) {
        if (today < startOfDay(startDate)) {
          isInDateRange = false;
        }
      }
      
      // Check if we're before the end date (if set) - use Date comparison
      if (endDate && isInDateRange) {
        if (today > endOfDay(endDate)) {
          isInDateRange = false;
        }
      }
      
      return isInDateRange;
    }
    return false;
  } else if (startDateStr && startDate) {
    // Date-based special (no weekly recurring)
    // Use Date objects with startOfDay/endOfDay for accurate comparison (same as homepage)
    const effectiveEndDate = endDate || startDate;
    const start = startOfDay(startDate);
    const end = endOfDay(effectiveEndDate);
    
    // Check if today is within the date range
    return today >= start && today <= end;
  }

  // If no appliesOn or startDate, treat as always active
  return true;
}

// Recurring event helper (mirrors homepage logic to avoid timezone drift)
function getRecurringEventOccurrences(event: any, rangeStart: Date, rangeEnd: Date) {
  if (!event.recurrenceRule) return [];

  const buildSimpleFallbackOccurrences = () => {
    try {
      const startDate = new Date(event.startDateTime);
      const rule = RRule.fromString(event.recurrenceRule);
      const ruleWithDtstart = new RRule({
        ...rule.options,
        dtstart: startDate,
      });
      const searchStart = startDate > rangeStart ? startDate : rangeStart;
      const occurrences = ruleWithDtstart.between(searchStart, rangeEnd, true);
      const duration = event.endDateTime
        ? new Date(event.endDateTime).getTime() - new Date(event.startDateTime).getTime()
        : null;

      return occurrences
        .map((occurrence) => {
          const eventEnd = duration !== null ? new Date(occurrence.getTime() + duration) : null;
          return {
            ...event,
            startDateTime: occurrence.toISOString(),
            endDateTime: eventEnd?.toISOString() || null,
            isRecurringOccurrence: true,
            recurrenceRule: event.recurrenceRule,
          };
        })
        .filter((occurrence) => {
          const occurrenceDate = new Date(occurrence.startDateTime);
          return occurrenceDate >= rangeStart && occurrenceDate <= rangeEnd;
        });
    } catch {
      return [];
    }
  };

  try {
    const exceptions: string[] = event.exceptions ? JSON.parse(event.exceptions) : [];
    const startDate = new Date(event.startDateTime);
    const durationMs = event.endDateTime
      ? new Date(event.endDateTime).getTime() - new Date(event.startDateTime).getTime()
      : null;

    const mtFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const originalStartMTParts = mtFormatter.formatToParts(startDate);
    const originalHours = parseInt(originalStartMTParts.find((p) => p.type === 'hour')!.value);
    const originalMinutes = parseInt(originalStartMTParts.find((p) => p.type === 'minute')!.value);
    const originalSeconds = parseInt(originalStartMTParts.find((p) => p.type === 'second')?.value || '0');

    let originalEndHours = 0;
    let originalEndMinutes = 0;
    let originalEndSeconds = 0;
    if (event.endDateTime) {
      const endDate = new Date(event.endDateTime);
      const originalEndMTParts = mtFormatter.formatToParts(endDate);
      originalEndHours = parseInt(originalEndMTParts.find((p) => p.type === 'hour')!.value);
      originalEndMinutes = parseInt(originalEndMTParts.find((p) => p.type === 'minute')!.value);
      originalEndSeconds = parseInt(originalEndMTParts.find((p) => p.type === 'second')?.value || '0');
    }

    const createMountainTimeDate = (
      year: number,
      month: number,
      day: number,
      hours: number,
      minutes: number,
      seconds: number
    ): Date => {
      for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
        const candidateUTC = new Date(Date.UTC(year, month, day, hours + offsetHours, minutes, seconds));
        const candidateParts = mtFormatter.formatToParts(candidateUTC);
        const candidateYear = parseInt(candidateParts.find((p) => p.type === 'year')!.value);
        const candidateMonth = parseInt(candidateParts.find((p) => p.type === 'month')!.value);
        const candidateDay = parseInt(candidateParts.find((p) => p.type === 'day')!.value);
        const candidateHour = parseInt(candidateParts.find((p) => p.type === 'hour')!.value);
        const candidateMinute = parseInt(candidateParts.find((p) => p.type === 'minute')!.value);
        const candidateSecond = parseInt(candidateParts.find((p) => p.type === 'second')?.value || '0');

        if (
          candidateYear === year &&
          candidateMonth === month + 1 &&
          candidateDay === day &&
          candidateHour === hours &&
          candidateMinute === minutes &&
          candidateSecond === seconds
        ) {
          return candidateUTC;
        }
      }

      return new Date(Date.UTC(year, month, day, hours + 7, minutes, seconds));
    };

    let ruleToUse = event.recurrenceRule;
    let dtstartDate: Date;

    if (event.recurrenceRule.includes('BYMONTHDAY')) {
      const monthDayMatch = event.recurrenceRule.match(/BYMONTHDAY=(\d+)/);
      if (monthDayMatch) {
        const targetDay = parseInt(monthDayMatch[1]);
        const localYear = startDate.getFullYear();
        const localMonth = startDate.getMonth();
        const localTargetMidday = new Date(localYear, localMonth, targetDay, 12, 0, 0);
        const utcMiddayDay = localTargetMidday.getUTCDate();
        const utcTargetYear = localTargetMidday.getUTCFullYear();
        const utcTargetMonth = localTargetMidday.getUTCMonth();
        const utcCorrespondingDay = utcMiddayDay;
        ruleToUse = event.recurrenceRule.replace(/BYMONTHDAY=\d+/, `BYMONTHDAY=${utcCorrespondingDay}`);
        dtstartDate = new Date(Date.UTC(utcTargetYear, utcTargetMonth, utcCorrespondingDay, 12, 0, 0));
      } else {
        dtstartDate = startDate;
      }
    } else if (event.recurrenceRule.includes('FREQ=WEEKLY')) {
      const bydayMatch = event.recurrenceRule.match(/BYDAY=([^;]+)/);
      const dayMap: Record<string, number> = {
        SU: 0,
        MO: 1,
        TU: 2,
        WE: 3,
        TH: 4,
        FR: 5,
        SA: 6,
      };

      const startMTParts = mtFormatter.formatToParts(startDate);
      const startMTYear = parseInt(startMTParts.find((p) => p.type === 'year')!.value);
      const startMTMonth = parseInt(startMTParts.find((p) => p.type === 'month')!.value) - 1;
      const startMTDay = parseInt(startMTParts.find((p) => p.type === 'day')!.value);
      const startMTDayOfWeek = new Date(startMTYear, startMTMonth, startMTDay).getDay();

      let candidateDtstart = createMountainTimeDate(startMTYear, startMTMonth, startMTDay, originalHours, originalMinutes, originalSeconds);

      if (bydayMatch) {
        const bydayStr = bydayMatch[1];
        const targetDays = bydayStr
          .split(',')
          .map((d: string) => dayMap[d.trim()])
          .filter((d: number | undefined): d is number => d !== undefined);

        const startDateMatches = targetDays.includes(startMTDayOfWeek);

        if (startDateMatches) {
          dtstartDate = candidateDtstart;
        } else {
          const sortedTargetDays = [...targetDays].sort((a, b) => a - b);
          const targetDay = sortedTargetDays.find((d) => d >= startMTDayOfWeek) || sortedTargetDays[0];
          let dayDiff = targetDay - startMTDayOfWeek;
          if (dayDiff < 0) dayDiff += 7;
          const adjustedDate = new Date(startMTYear, startMTMonth, startMTDay + dayDiff);
          dtstartDate = createMountainTimeDate(
            adjustedDate.getFullYear(),
            adjustedDate.getMonth(),
            adjustedDate.getDate(),
            originalHours,
            originalMinutes,
            originalSeconds
          );
        }
      } else {
        dtstartDate = candidateDtstart;
      }
    } else {
      dtstartDate = startDate;
    }

    const rule = RRule.fromString(ruleToUse);
    const ruleOptions = {
      ...rule.options,
      dtstart: dtstartDate,
    };
    const ruleWithDtstart = new RRule(ruleOptions);

    const searchStart = startDate > rangeStart ? startDate : rangeStart;
    const occurrences = ruleWithDtstart.between(searchStart, rangeEnd, true);

    const mapped = occurrences
      .filter((occurrence) => {
        const occurrenceDateStr = format(occurrence, 'yyyy-MM-dd');
        return !exceptions.includes(occurrenceDateStr);
      })
      .map((occurrence) => {
        const occurrenceMTParts = mtFormatter.formatToParts(occurrence);
        const occurrenceMTYear = parseInt(occurrenceMTParts.find((p) => p.type === 'year')!.value);
        const occurrenceMTMonth = parseInt(occurrenceMTParts.find((p) => p.type === 'month')!.value);
        const occurrenceMTDay = parseInt(occurrenceMTParts.find((p) => p.type === 'day')!.value);

        let eventStart: Date;
        if (event.recurrenceRule && event.recurrenceRule.includes('BYMONTHDAY')) {
          const monthDayMatch = event.recurrenceRule.match(/BYMONTHDAY=(\d+)/);
          if (monthDayMatch) {
            const targetDay = parseInt(monthDayMatch[1]);
            const occurrenceLocalDay = occurrence.getDate();
            if (occurrenceLocalDay !== targetDay) {
              eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, targetDay, originalHours, originalMinutes, originalSeconds);
            } else {
              eventStart = createMountainTimeDate(
                occurrenceMTYear,
                occurrenceMTMonth - 1,
                occurrenceMTDay,
                originalHours,
                originalMinutes,
                originalSeconds
              );
            }
          } else {
            eventStart = createMountainTimeDate(
              occurrenceMTYear,
              occurrenceMTMonth - 1,
              occurrenceMTDay,
              originalHours,
              originalMinutes,
              originalSeconds
            );
          }
        } else if (event.recurrenceRule && event.recurrenceRule.includes('FREQ=WEEKLY')) {
          const bydayMatch = event.recurrenceRule.match(/BYDAY=([^;]+)/);
          const dayMap: Record<string, number> = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
          };

          const occurrenceMTDayOfWeek = new Date(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay).getDay();

          if (bydayMatch) {
            const bydayStr = bydayMatch[1];
            const targetDays = bydayStr
              .split(',')
              .map((d: string) => dayMap[d.trim()])
              .filter((d: number | undefined): d is number => d !== undefined);

            if (targetDays.includes(occurrenceMTDayOfWeek)) {
              eventStart = createMountainTimeDate(
                occurrenceMTYear,
                occurrenceMTMonth - 1,
                occurrenceMTDay,
                originalHours,
                originalMinutes,
                originalSeconds
              );
            } else {
              const sortedTargetDays = [...targetDays].sort((a, b) => a - b);
              const targetDay = sortedTargetDays.find((d) => d >= occurrenceMTDayOfWeek) || sortedTargetDays[0];
              let dayDiff = targetDay - occurrenceMTDayOfWeek;
              if (dayDiff < 0) dayDiff += 7;
              const adjustedDay = occurrenceMTDay + dayDiff;
              eventStart = createMountainTimeDate(
                occurrenceMTYear,
                occurrenceMTMonth - 1,
                adjustedDay,
                originalHours,
                originalMinutes,
                originalSeconds
              );
            }
          } else {
            eventStart = createMountainTimeDate(
              occurrenceMTYear,
              occurrenceMTMonth - 1,
              occurrenceMTDay,
              originalHours,
              originalMinutes,
              originalSeconds
            );
          }
        } else {
          eventStart = createMountainTimeDate(
            occurrenceMTYear,
            occurrenceMTMonth - 1,
            occurrenceMTDay,
            originalHours,
            originalMinutes,
            originalSeconds
          );
        }

        const eventEnd =
          durationMs !== null ? new Date(eventStart.getTime() + durationMs) : null;

        return {
          ...event,
          startDateTime: eventStart.toISOString(),
          endDateTime: eventEnd?.toISOString() || null,
          isRecurringOccurrence: true,
          recurrenceRule: event.recurrenceRule,
        };
      });

    if (mapped.length === 0) {
      return buildSimpleFallbackOccurrences();
    }

    return mapped;
  } catch {
    return buildSimpleFallbackOccurrences();
  }
}

function formatEventDate(date: Date) {
  return dateFormatter.format(date);
}

function formatEventTimeRange(start: Date, end?: Date | null) {
  const startLabel = timeFormatter.format(start);
  if (!end) return startLabel;
  return `${startLabel} - ${timeFormatter.format(end)}`;
}

function formatDebugDate(dt: Date) {
  const mtFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return {
    iso: dt.toISOString(),
    mt: mtFormatter.format(dt),
  };
}

export default async function SpecialsTvPage({ searchParams }: SpecialsTvPageProps) {
  const resolvedSearchParams: SearchParamsShape = searchParams
    ? await Promise.resolve(searchParams)
    : {};
  const getParam = (key: keyof SearchParamsShape) => {
    const value = resolvedSearchParams?.[key as string];
    return Array.isArray(value) ? value[0] : value;
  };

  const today = getMountainTimeToday();
  const todayName = getMountainTimeWeekday();
  const now = getMountainTimeNow();
  const debug = getParam('debug') === '1' || getParam('debug') === 'true';

  const windowStart = parseMountainTimeDate(getMountainTimeDateString(today));
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 60);

  const [allSpecials, allEvents, signageSetting] = await Promise.all([
    prisma.special.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    // Pull events that start on/after windowStart OR have recurrences that extend into our window.
    // We include base events whose startDateTime is before windowStart so their recurrences are expanded.
    prisma.event.findMany({
      where: {
        startDateTime: {
          lte: rangeEnd, // ensure we include bases that can generate upcoming occurrences
        },
      },
      orderBy: { startDateTime: 'asc' },
    }),
    prisma.setting.findUnique({ where: { key: 'signageConfig' } }),
  ]);

  const signageConfig = sanitizeSignageConfig(signageSetting?.value);

  const slideDurationSeconds = clamp(
    Number(getParam('slideDurationSeconds') ?? getParam('slideDuration') ?? signageConfig.slideDurationSeconds) ||
      signageConfig.slideDurationSeconds,
    4,
    60
  );
  const fadeDurationSeconds = clamp(
    Number(getParam('fadeDurationSeconds') ?? getParam('fadeDuration') ?? signageConfig.fadeDurationSeconds) ||
      signageConfig.fadeDurationSeconds,
    0.3,
    5
  );
  const upcomingEventsTileCount = signageConfig.upcomingEventsTileCount;

  const slideDurationMs = Math.round(slideDurationSeconds * 1000);
  const fadeDurationMs = Math.round(fadeDurationSeconds * 1000);

  const todaysFoodSpecials = allSpecials.filter(
    (special) =>
      signageConfig.includeFoodSpecials && (special.type === 'food' || !special.type) && isSpecialActiveToday(special, today, todayName)
  );
  const todaysDrinkSpecials = allSpecials.filter(
    (special) => {
      if (!signageConfig.includeDrinkSpecials || special.type !== 'drink') return false;
      const isActive = isSpecialActiveToday(special, today, todayName);
      if (debug && special.type === 'drink') {
        const appliesOn = parseAppliesOn(special.appliesOn);
        console.log(`[DEBUG] Drink special "${special.title}":`, {
          appliesOn,
          todayName,
          isActive,
          startDate: special.startDate,
          endDate: special.endDate,
        });
      }
      return isActive;
    }
  );

  // Hardcoded happy hour values
  const happyHour = {
    title: 'Buy One Get One',
    description: 'BOGO on Wine, Well & Drafts',
    times: '10am-12pm & 4pm-7pm',
  };

  const occurrenceRangeStart = windowStart;

  const recurringBaseOccurrences = signageConfig.includeEvents
    ? allEvents
        .filter((event) => event.recurrenceRule)
        .filter((event) => new Date(event.startDateTime) >= windowStart)
    : [];

  const recurringExpandedOccurrences = signageConfig.includeEvents
    ? allEvents
        .filter((event) => event.recurrenceRule)
        .flatMap((event) => getRecurringEventOccurrences(event, occurrenceRangeStart, rangeEnd))
        .filter((occurrence) => {
          const start = new Date(occurrence.startDateTime);
          return start >= windowStart;
        })
    : [];

  const recurringOccurrences = signageConfig.includeEvents
    ? [...recurringBaseOccurrences, ...recurringExpandedOccurrences]
    : [];

  const oneTimeEvents = signageConfig.includeEvents
    ? allEvents.filter((event) => {
        const start = new Date(event.startDateTime);
        return start >= windowStart && !event.recurrenceRule;
      })
    : [];

  const allUpcomingEvents = signageConfig.includeEvents
    ? [...oneTimeEvents, ...recurringOccurrences].sort(
        (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      )
    : [];

  // Simply take the next N upcoming events in chronological order
  const upcomingEvents = signageConfig.includeEvents
    ? allUpcomingEvents.slice(0, upcomingEventsTileCount)
    : [];

  // Debug logging
  if (debug) {
    const logEvents = (label: string, items: any[]) => {
      console.log(`[DEBUG specials-tv] ${label}`, items.map((e, idx) => ({
        idx,
        title: e.title,
        start: formatDebugDate(new Date(e.startDateTime)),
        end: e.endDateTime ? formatDebugDate(new Date(e.endDateTime)) : null,
        recurrenceRule: e.recurrenceRule ?? null,
      })));
    };
    logEvents('allEvents (DB, >= today MT)', allEvents.slice(0, 20));
    logEvents('recurringOccurrences (expanded)', recurringOccurrences.slice(0, 20));
    logEvents('oneTimeEvents', oneTimeEvents.slice(0, 20));
    logEvents('allUpcomingEvents (sorted)', allUpcomingEvents.slice(0, 20));
    logEvents('upcomingEvents (selected, limited)', upcomingEvents);
  }

  // Debug logging
  if (debug) {
    console.log('[DEBUG] Drink specials filtering:', {
      totalDrinkSpecials: allSpecials.filter(s => s.type === 'drink').length,
      todaysDrinkSpecialsCount: todaysDrinkSpecials.length,
      todaysDrinkSpecials: todaysDrinkSpecials.map(s => ({
        title: s.title,
        appliesOn: s.appliesOn,
        isActive: s.isActive,
      })),
      signageConfig: {
        includeDrinkSpecials: signageConfig.includeDrinkSpecials,
        includeHappyHour: signageConfig.includeHappyHour,
      },
    });
  }

  const slides: SlideContent[] = buildSlides({
    todayLabel: todayName,
    happyHour: {
      title: happyHour?.title,
      description: happyHour?.description,
      times: happyHour?.times,
    },
    food: todaysFoodSpecials.map((special) => ({
      title: special.title || 'Special',
      note: special.priceNotes || undefined,
      detail: special.description || undefined,
      time: special.timeWindow || undefined,
      image: special.image || undefined,
    })),
    drink: todaysDrinkSpecials.map((special) => {
      const drinkItem = {
        title: special.title || 'Special',
        note: special.priceNotes || undefined,
        detail: special.description || undefined,
        time: special.timeWindow || undefined,
      };
      if (debug) {
        console.log('[DEBUG] Mapping drink special to slide item:', {
          original: { title: special.title, description: special.description },
          mapped: drinkItem,
        });
      }
      return drinkItem;
    }),
    events: upcomingEvents.map((event) => {
      const start = new Date(event.startDateTime);
      const end = event.endDateTime ? new Date(event.endDateTime) : null;
      return {
        title: event.title,
        note: formatEventDate(start),
        detail: event.description || undefined,
        time: formatEventTimeRange(start, end),
      };
    }),
    config: {
      includeFoodSpecials: signageConfig.includeFoodSpecials,
      includeDrinkSpecials: signageConfig.includeDrinkSpecials,
      includeHappyHour: signageConfig.includeHappyHour,
      includeEvents: signageConfig.includeEvents,
      customSlides: signageConfig.customSlides || [],
    },
  });

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050608] text-white">
      <SignageRotator slides={slides} slideDurationMs={slideDurationMs} fadeDurationMs={fadeDurationMs} debug={debug} />
    </div>
  );
}

