'use client';

import { StatusType } from '../components/status-badge';
import { getMountainTimeDateString, getMountainTimeToday, parseMountainTimeDate } from './timezone';

/**
 * Helper function to determine status based on item properties
 */
export function getItemStatus(item: {
  isActive?: boolean;
  isPublished?: boolean;
  publishAt?: string | null;
  expiresAt?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): StatusType[] {
  const statuses: StatusType[] = [];
  const now = new Date();
  const mtToday = getMountainTimeToday();
  const mtTodayStr = getMountainTimeDateString(mtToday);

  // For items with publish dates (announcements, specials)
  if (item.publishAt !== undefined || item.expiresAt !== undefined) {
    const publishAt = item.publishAt ? new Date(item.publishAt) : null;
    const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;

    if (publishAt && publishAt > now) {
      statuses.push('scheduled');
    } else if (expiresAt && expiresAt < now) {
      statuses.push('expired');
    }

    if (item.isPublished !== undefined) {
      statuses.push(item.isPublished ? 'published' : 'draft');
    }
  }

  // For events with start/end dates
  if (item.startDateTime) {
    const startDate = new Date(item.startDateTime);
    const endDate = item.endDateTime ? new Date(item.endDateTime) : null;
    
    if (endDate && endDate < now) {
      statuses.push('past');
    } else if (startDate > now) {
      statuses.push('scheduled');
    }
  }

  // For specials with startDate/endDate (date-only strings like YYYY-MM-DD)
  // Compare dates in Mountain Time to avoid timezone issues
  if (item.startDate || item.endDate) {
    // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (item.startDate) {
      const startDateValue = item.startDate as string | Date;
      startDateStr = typeof startDateValue === 'string' 
        ? startDateValue.split('T')[0] 
        : getMountainTimeDateString(startDateValue);
    }
    
    if (item.endDate) {
      const endDateValue = item.endDate as string | Date;
      endDateStr = typeof endDateValue === 'string' 
        ? endDateValue.split('T')[0] 
        : getMountainTimeDateString(endDateValue);
    }
    
    // Compare date strings directly (YYYY-MM-DD format)
    // A date is "past" only if it's before today in Mountain Time
    if (endDateStr && endDateStr < mtTodayStr) {
      statuses.push('past');
    } else if (startDateStr && startDateStr > mtTodayStr) {
      statuses.push('scheduled');
    }
  }

  // Active/Inactive status
  // For food specials with dates: only show as active if date matches today AND isActive is true
  if (item.isActive !== undefined) {
    if (item.startDate) {
      // For date-based specials, only show active if the date is today
      const startDateValue = item.startDate as string | Date;
      const startDateStr = typeof startDateValue === 'string' 
        ? startDateValue.split('T')[0] 
        : getMountainTimeDateString(startDateValue);
      
      if (item.isActive && startDateStr === mtTodayStr) {
        statuses.push('active');
      } else {
        statuses.push('inactive');
      }
    } else {
      // For non-date-based items, use isActive as-is
      statuses.push(item.isActive ? 'active' : 'inactive');
    }
  }

  // Available/Unavailable status (for menu items)
  if ('isAvailable' in item) {
    statuses.push((item as any).isAvailable ? 'available' : 'unavailable');
  }

  return statuses.length > 0 ? statuses : ['inactive'];
}

