/**
 * Permission system for role-based access control
 * 
 * Roles:
 * - admin: Highest role, full access to all features
 * - owner: Full admin access (same as admin for now)
 */

export type UserRole = 'admin' | 'owner';

export interface Permissions {
  // User management
  canManageUsers: boolean;
  
  // Admin features
  canAccessAdmin: boolean;
  canManageMenu: boolean;
  canManageEvents: boolean;
  canManageSpecials: boolean;
  canManageAnnouncements: boolean;
  canManageOrders: boolean;
  canManageStaff: boolean; // Employee management (schedules, payroll, etc.)
  canAccessReporting: boolean;
  canAccessSettings: boolean;
  canAccessKDS: boolean; // Kitchen Display System
  
  // Staff features
  canViewOwnSchedule: boolean;
  canClockInOut: boolean;
  canAccessKitchen: boolean; // Kitchen display access
}

export function getPermissions(role: string | null | undefined): Permissions {
  if (!role) {
    return getDefaultPermissions();
  }

  switch (role) {
    case 'admin':
      // Admin has full permissions
      return {
        canManageUsers: true,
        canAccessAdmin: true,
        canManageMenu: true,
        canManageEvents: true,
        canManageSpecials: true,
        canManageAnnouncements: true,
        canManageOrders: true,
        canManageStaff: true,
        canAccessReporting: true,
        canAccessSettings: true,
        canAccessKDS: true,
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: true,
      };
    
    case 'owner':
      // Owner has full permissions (same as admin)
      return {
        canManageUsers: true,
        canAccessAdmin: true,
        canManageMenu: true,
        canManageEvents: true,
        canManageSpecials: true,
        canManageAnnouncements: true,
        canManageOrders: true,
        canManageStaff: true,
        canAccessReporting: true,
        canAccessSettings: true,
        canAccessKDS: true,
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: true,
      };
    
    default:
      return getDefaultPermissions();
  }
}

function getDefaultPermissions(): Permissions {
  // Default to no permissions
  return {
    canManageUsers: false,
    canAccessAdmin: false,
    canManageMenu: false,
    canManageEvents: false,
    canManageSpecials: false,
    canManageAnnouncements: false,
    canManageOrders: false,
    canManageStaff: false,
    canAccessReporting: false,
    canAccessSettings: false,
    canAccessKDS: false,
    canViewOwnSchedule: false,
    canClockInOut: false,
    canAccessKitchen: false,
  };
}

/**
 * Check if a user can perform an action on another user
 */
export function canManageUser(
  currentUserRole: string | null | undefined,
  targetUserRole: string | null | undefined
): boolean {
  if (!currentUserRole || !targetUserRole) return false;
  
  // Only admin and owner can manage users, and they can only manage other admin/owner users
  if (currentUserRole !== 'admin' && currentUserRole !== 'owner') {
    return false;
  }
  
  // Admin and owner can manage each other
  if (targetUserRole === 'admin' || targetUserRole === 'owner') {
    return true;
  }
  
  return false;
}

/**
 * Check if a user can create a user with a specific role
 */
export function canCreateRole(
  currentUserRole: string | null | undefined,
  targetRole: string
): boolean {
  if (!currentUserRole) return false;
  
  // Only admin and owner can create users
  if (currentUserRole !== 'admin' && currentUserRole !== 'owner') {
    return false;
  }
  
  // Can only create admin or owner roles
  return targetRole === 'admin' || targetRole === 'owner';
}
