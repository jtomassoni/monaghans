'use client';

import { StatusType } from '../components/status-badge';

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

  // For specials with startDate/endDate
  if (item.startDate || item.endDate) {
    const startDate = item.startDate ? new Date(item.startDate) : null;
    const endDate = item.endDate ? new Date(item.endDate) : null;
    
    if (endDate && endDate < now) {
      statuses.push('past');
    } else if (startDate && startDate > now) {
      statuses.push('scheduled');
    }
  }

  // Active/Inactive status
  if (item.isActive !== undefined) {
    statuses.push(item.isActive ? 'active' : 'inactive');
  }

  // Available/Unavailable status (for menu items)
  if ('isAvailable' in item) {
    statuses.push((item as any).isAvailable ? 'available' : 'unavailable');
  }

  return statuses.length > 0 ? statuses : ['inactive'];
}

