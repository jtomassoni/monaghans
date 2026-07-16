import { addDays } from 'date-fns';
import { RRule } from 'rrule';
import {
  getMountainTimeDateString,
  parseMountainTimeDate,
} from '@/lib/timezone';

const COMPANY_TZ = 'America/Denver';

const RRULE_DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const WEEKDAY_NAME_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export type RecurringEventInput = {
  id: string;
  title: string;
  description?: string | null;
  startDateTime: string | Date;
  endDateTime?: string | Date | null;
  recurrenceRule: string | null;
  exceptions?: string | null;
  venueArea?: string | null;
  image?: string | null;
  isActive?: boolean;
};

export type RecurringEventOccurrence<T extends RecurringEventInput = RecurringEventInput> = Omit<
  T,
  'startDateTime' | 'endDateTime'
> & {
  startDateTime: string;
  endDateTime: string | null;
  isRecurringOccurrence: true;
};

function createMountainTimeFormatter() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: COMPANY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function createMountainTimeDate(
  mtFormatter: Intl.DateTimeFormat,
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number
): Date {
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
}

function getCalendarDatesInRange(rangeStart: Date, rangeEnd: Date): Set<string> {
  const dates = new Set<string>();
  let cursor = parseMountainTimeDate(getMountainTimeDateString(rangeStart));
  while (cursor < rangeEnd) {
    const dateStr = getMountainTimeDateString(cursor);
    dates.add(dateStr);
    cursor = addDays(parseMountainTimeDate(dateStr), 1);
  }
  return dates;
}

function parseWeeklyTargetDays(recurrenceRule: string, startDate: Date): number[] {
  const bydayMatch = recurrenceRule.match(/BYDAY=([^;]+)/i);
  if (bydayMatch) {
    const targetDays = bydayMatch[1]
      .split(',')
      .map((day) => RRULE_DAY_MAP[day.trim().toUpperCase()])
      .filter((day): day is number => day !== undefined);
    if (targetDays.length > 0) return targetDays;
  }

  const startDateStr = getMountainTimeDateString(startDate);
  return [weekdayForMountainDate(startDateStr)];
}

function weekdayForMountainDate(dateStr: string): number {
  const weekday = parseMountainTimeDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: COMPANY_TZ,
  });
  return WEEKDAY_NAME_MAP[weekday] ?? 0;
}

function filterOccurrencesToRangeCalendarDays<T extends RecurringEventInput>(
  occurrences: RecurringEventOccurrence<T>[],
  rangeStart: Date,
  rangeEnd: Date
): RecurringEventOccurrence<T>[] {
  const validDates = getCalendarDatesInRange(rangeStart, rangeEnd);
  return occurrences.filter((occurrence) => {
    const occurrenceDateStr = getMountainTimeDateString(new Date(occurrence.startDateTime));
    return validDates.has(occurrenceDateStr);
  });
}

function buildOccurrence<T extends RecurringEventInput>(
  event: T,
  eventStart: Date,
  eventEnd: Date | null
): RecurringEventOccurrence<T> {
  return {
    ...event,
    startDateTime: eventStart.toISOString(),
    endDateTime: eventEnd?.toISOString() || null,
    isRecurringOccurrence: true,
  };
}

function getWeeklyByDayOccurrences<T extends RecurringEventInput>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date,
  exceptions: string[],
  mtFormatter: Intl.DateTimeFormat,
  originalHours: number,
  originalMinutes: number,
  originalSeconds: number,
  originalEndHours: number,
  originalEndMinutes: number,
  originalEndSeconds: number
): RecurringEventOccurrence<T>[] {
  if (!event.recurrenceRule) return [];

  const targetDays = parseWeeklyTargetDays(event.recurrenceRule, new Date(event.startDateTime));
  if (targetDays.length === 0) return [];

  const startDate = new Date(event.startDateTime);
  const searchStart = startDate > rangeStart ? startDate : rangeStart;
  const results: RecurringEventOccurrence<T>[] = [];

  let cursor = parseMountainTimeDate(getMountainTimeDateString(rangeStart));
  while (cursor < rangeEnd) {
    const dateStr = getMountainTimeDateString(cursor);
    const dow = weekdayForMountainDate(dateStr);

    if (targetDays.includes(dow) && !exceptions.includes(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const eventStart = createMountainTimeDate(
        mtFormatter,
        year,
        month - 1,
        day,
        originalHours,
        originalMinutes,
        originalSeconds
      );

      if (eventStart >= searchStart && eventStart < rangeEnd) {
        const eventEnd = event.endDateTime
          ? createMountainTimeDate(
              mtFormatter,
              year,
              month - 1,
              day,
              originalEndHours,
              originalEndMinutes,
              originalEndSeconds
            )
          : null;
        results.push(buildOccurrence(event, eventStart, eventEnd));
      }
    }

    cursor = addDays(parseMountainTimeDate(dateStr), 1);
  }

  return results;
}

/**
 * Expand a recurring event into concrete occurrences within a date range.
 * Weekly BYDAY events use Mountain Time calendar days (not RRule UTC math)
 * so events like "Wednesday pool" don't appear on Tuesday in the hero.
 */
export function getRecurringEventOccurrences<T extends RecurringEventInput>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date
): RecurringEventOccurrence<T>[] {
  if (!event.recurrenceRule) return [];

  try {
    const exceptions: string[] = event.exceptions ? JSON.parse(event.exceptions) : [];
    const startDate = new Date(event.startDateTime);
    const mtFormatter = createMountainTimeFormatter();

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

    if (event.recurrenceRule.toUpperCase().includes('FREQ=WEEKLY')) {
      return filterOccurrencesToRangeCalendarDays(
        getWeeklyByDayOccurrences(
          event,
          rangeStart,
          rangeEnd,
          exceptions,
          mtFormatter,
          originalHours,
          originalMinutes,
          originalSeconds,
          originalEndHours,
          originalEndMinutes,
          originalEndSeconds
        ),
        rangeStart,
        rangeEnd
      );
    }

    let ruleToUse = event.recurrenceRule;
    let dtstartDate: Date = startDate;

    if (event.recurrenceRule.includes('BYMONTHDAY')) {
      const monthDayMatch = event.recurrenceRule.match(/BYMONTHDAY=(\d+)/);
      if (monthDayMatch) {
        const targetDay = parseInt(monthDayMatch[1]);
        const startMTParts = mtFormatter.formatToParts(startDate);
        const startMTYear = parseInt(startMTParts.find((p) => p.type === 'year')!.value);
        const startMTMonth = parseInt(startMTParts.find((p) => p.type === 'month')!.value) - 1;
        dtstartDate = createMountainTimeDate(
          mtFormatter,
          startMTYear,
          startMTMonth,
          targetDay,
          originalHours,
          originalMinutes,
          originalSeconds
        );
        ruleToUse = event.recurrenceRule;
      }
    }

    const rule = RRule.fromString(ruleToUse);
    const ruleWithDtstart = new RRule({
      ...rule.options,
      dtstart: dtstartDate,
    });

    const searchStart = startDate > rangeStart ? startDate : rangeStart;
    const occurrences = ruleWithDtstart.between(searchStart, rangeEnd, true);

    return filterOccurrencesToRangeCalendarDays(
      occurrences
      .filter((occurrence) => {
        const occurrenceDateStr = getMountainTimeDateString(occurrence);
        return !exceptions.includes(occurrenceDateStr);
      })
      .map((occurrence) => {
        const occurrenceMTParts = mtFormatter.formatToParts(occurrence);
        const occurrenceMTYear = parseInt(occurrenceMTParts.find((p) => p.type === 'year')!.value);
        const occurrenceMTMonth = parseInt(occurrenceMTParts.find((p) => p.type === 'month')!.value);
        const occurrenceMTDay = parseInt(occurrenceMTParts.find((p) => p.type === 'day')!.value);

        const eventStart = createMountainTimeDate(
          mtFormatter,
          occurrenceMTYear,
          occurrenceMTMonth - 1,
          occurrenceMTDay,
          originalHours,
          originalMinutes,
          originalSeconds
        );

        const eventEnd = event.endDateTime
          ? createMountainTimeDate(
              mtFormatter,
              occurrenceMTYear,
              occurrenceMTMonth - 1,
              occurrenceMTDay,
              originalEndHours,
              originalEndMinutes,
              originalEndSeconds
            )
          : null;

        return buildOccurrence(event, eventStart, eventEnd);
      })
      .filter((occurrence) => {
        const occurrenceDate = new Date(occurrence.startDateTime);
        return occurrenceDate >= searchStart && occurrenceDate < rangeEnd;
      }),
      rangeStart,
      rangeEnd
    );
  } catch {
    return [];
  }
}
