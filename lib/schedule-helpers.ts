/**
 * Schedule Helpers
 * Functions to calculate shift times based on business hours and role
 */

export type EmployeeRole = 'cook' | 'bartender' | 'barback';
export type ShiftType = 'open' | 'close';

interface BusinessHours {
  [key: string]: {
    open: string; // "10:00"
    close: string; // "02:00" (next day)
  };
}

/**
 * Get business hours from settings
 */
export async function getBusinessHours(): Promise<BusinessHours> {
  const { prisma } = await import('@/lib/prisma');
  const hoursSetting = await prisma.setting.findUnique({
    where: { key: 'hours' },
  });

  if (!hoursSetting) {
    // Default hours if not set
    return {
      monday: { open: '10:00', close: '02:00' },
      tuesday: { open: '10:00', close: '02:00' },
      wednesday: { open: '10:00', close: '02:00' },
      thursday: { open: '10:00', close: '02:00' },
      friday: { open: '10:00', close: '02:00' },
      saturday: { open: '10:00', close: '02:00' },
      sunday: { open: '10:00', close: '02:00' },
    };
  }

  return JSON.parse(hoursSetting.value);
}

/**
 * Get day name from date (monday, tuesday, etc.)
 */
export function getDayName(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Parse time string (e.g., "10:00") to hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Calculate shift start and end times based on:
 * - Business hours
 * - Employee role (kitchen starts 1hr early)
 * - Shift type (open or close)
 * - Date
 */
export async function calculateShiftTimes(
  date: Date,
  shiftType: ShiftType,
  role: EmployeeRole
): Promise<{ startTime: Date; endTime: Date }> {
  const hours = await getBusinessHours();
  const dayName = getDayName(date);
  const dayHours = hours[dayName];

  if (!dayHours || !dayHours.open || !dayHours.close) {
    throw new Error(`No business hours set for ${dayName}`);
  }

  const openTime = parseTime(dayHours.open);
  const closeTime = parseTime(dayHours.close);

  // Create base date (midnight of the shift date)
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  let startTime: Date;
  let endTime: Date;

  if (shiftType === 'open') {
    // Open shift: from opening time to 4pm
    startTime = new Date(baseDate);
    startTime.setHours(openTime.hours, openTime.minutes, 0, 0);

    // Kitchen starts 1 hour early
    if (role === 'cook') {
      startTime.setHours(startTime.getHours() - 1);
    }

    // End at 4pm
    endTime = new Date(baseDate);
    endTime.setHours(16, 0, 0, 0); // 4pm
  } else {
    // Close shift: from 4pm to closing time
    startTime = new Date(baseDate);
    startTime.setHours(16, 0, 0, 0); // 4pm

    // Kitchen starts 1 hour early (3pm for close shift)
    if (role === 'cook') {
      startTime.setHours(startTime.getHours() - 1);
    }

    // End at closing time (may be next day if close time is after midnight)
    endTime = new Date(baseDate);
    endTime.setHours(closeTime.hours, closeTime.minutes, 0, 0);

    // If close time is before open time (e.g., 02:00), it's the next day
    if (closeTime.hours < openTime.hours || (closeTime.hours === openTime.hours && closeTime.minutes < openTime.minutes)) {
      endTime.setDate(endTime.getDate() + 1);
    }

    // Kitchen ends 1 hour before close, then cleans until 1 hour after close
    if (role === 'cook') {
      // Kitchen closes at midnight (or 1 hour before regular close, whichever is earlier)
      const kitchenCloseTime = new Date(endTime);
      kitchenCloseTime.setHours(kitchenCloseTime.getHours() - 1);
      
      // If kitchen close would be after midnight, set to midnight
      if (kitchenCloseTime.getDate() !== baseDate.getDate()) {
        kitchenCloseTime.setDate(baseDate.getDate() + 1);
        kitchenCloseTime.setHours(0, 0, 0, 0);
      }

      // Cleanup time: 1 hour after kitchen close
      endTime = new Date(kitchenCloseTime);
      endTime.setHours(endTime.getHours() + 1);
    }
  }

  return { startTime, endTime };
}

/**
 * Format shift time for display
 */
export function formatShiftTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate hours worked from shift times
 */
export function calculateHoursWorked(
  clockIn: Date,
  clockOut: Date | null,
  breakMin: number = 0
): number | null {
  if (!clockOut) return null;

  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  const hours = (diffMinutes - breakMin) / 60;

  return Math.round(hours * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate labor cost for a shift
 */
export function calculateShiftCost(
  hoursWorked: number | null,
  hourlyWage: number
): number | null {
  if (hoursWorked === null) return null;
  return Math.round(hoursWorked * hourlyWage * 100) / 100;
}

