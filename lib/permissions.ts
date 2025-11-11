/**
 * Permission system for role-based access control
 * 
 * Roles (in hierarchy order):
 * - admin: Highest role, full access including creating owner accounts
 * - owner: Can manage managers and below, full admin access
 * - manager: Full admin access, but cannot manage manager accounts
 * - bartender: Can see own schedule and clock in/out
 * - barback: Can see own schedule and clock in/out
 * - cook: Can see own schedule, clock in/out, and access kitchen display
 */

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'admin' | 'cook' | 'bartender' | 'barback';

export interface Permissions {
  // User management
  canCreateOwner: boolean;
  canCreateManager: boolean;
  canCreateStaff: boolean; // cook, bartender, barback
  canEditOwner: boolean;
  canEditManager: boolean;
  canEditStaff: boolean;
  canDeleteOwner: boolean;
  canDeleteManager: boolean;
  canDeleteStaff: boolean;
  
  // Admin features
  canAccessAdmin: boolean;
  canManageMenu: boolean;
  canManageEvents: boolean;
  canManageSpecials: boolean;
  canManageAnnouncements: boolean;
  canManageOrders: boolean;
  canManageStaff: boolean; // Employee management (schedules, payroll, etc.)
  canManageUsers: boolean; // User account management
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
      // Admin is the highest role with full permissions
      return {
        canCreateOwner: true,
        canCreateManager: true,
        canCreateStaff: true,
        canEditOwner: true,
        canEditManager: true,
        canEditStaff: true,
        canDeleteOwner: true,
        canDeleteManager: true,
        canDeleteStaff: true,
        canAccessAdmin: true,
        canManageMenu: true,
        canManageEvents: true,
        canManageSpecials: true,
        canManageAnnouncements: true,
        canManageOrders: true,
        canManageStaff: true,
        canManageUsers: true,
        canAccessReporting: true,
        canAccessSettings: true,
        canAccessKDS: true,
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: true,
      };
    
    case 'superadmin':
      // Superadmin kept for compatibility, same as admin
      return {
        canCreateOwner: true,
        canCreateManager: true,
        canCreateStaff: true,
        canEditOwner: true,
        canEditManager: true,
        canEditStaff: true,
        canDeleteOwner: true,
        canDeleteManager: true,
        canDeleteStaff: true,
        canAccessAdmin: true,
        canManageMenu: true,
        canManageEvents: true,
        canManageSpecials: true,
        canManageAnnouncements: true,
        canManageOrders: true,
        canManageStaff: true,
        canManageUsers: true,
        canAccessReporting: true,
        canAccessSettings: true,
        canAccessKDS: true,
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: true,
      };
    
    case 'owner':
      return {
        canCreateOwner: false,
        canCreateManager: true,
        canCreateStaff: true,
        canEditOwner: false,
        canEditManager: true,
        canEditStaff: true,
        canDeleteOwner: false,
        canDeleteManager: true,
        canDeleteStaff: true,
        canAccessAdmin: true,
        canManageMenu: true,
        canManageEvents: true,
        canManageSpecials: true,
        canManageAnnouncements: true,
        canManageOrders: true,
        canManageStaff: true,
        canManageUsers: true,
        canAccessReporting: true,
        canAccessSettings: true,
        canAccessKDS: true,
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: true,
      };
    
    case 'manager':
      return {
        canCreateOwner: false,
        canCreateManager: false,
        canCreateStaff: true,
        canEditOwner: false,
        canEditManager: false,
        canEditStaff: true,
        canDeleteOwner: false,
        canDeleteManager: false,
        canDeleteStaff: true,
        canAccessAdmin: true,
        canManageMenu: true,
        canManageEvents: true,
        canManageSpecials: true,
        canManageAnnouncements: true,
        canManageOrders: true,
        canManageStaff: true,
        canManageUsers: false, // Cannot manage user accounts
        canAccessReporting: true,
        canAccessSettings: true,
        canAccessKDS: true,
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: true,
      };
    
    case 'cook':
      return {
        canCreateOwner: false,
        canCreateManager: false,
        canCreateStaff: false,
        canEditOwner: false,
        canEditManager: false,
        canEditStaff: false,
        canDeleteOwner: false,
        canDeleteManager: false,
        canDeleteStaff: false,
        canAccessAdmin: false,
        canManageMenu: false,
        canManageEvents: false,
        canManageSpecials: false,
        canManageAnnouncements: false,
        canManageOrders: false,
        canManageStaff: false,
        canManageUsers: false,
        canAccessReporting: false,
        canAccessSettings: false,
        canAccessKDS: true, // Cooks can access kitchen display
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: true,
      };
    
    case 'bartender':
    case 'barback':
      return {
        canCreateOwner: false,
        canCreateManager: false,
        canCreateStaff: false,
        canEditOwner: false,
        canEditManager: false,
        canEditStaff: false,
        canDeleteOwner: false,
        canDeleteManager: false,
        canDeleteStaff: false,
        canAccessAdmin: false,
        canManageMenu: false,
        canManageEvents: false,
        canManageSpecials: false,
        canManageAnnouncements: false,
        canManageOrders: false,
        canManageStaff: false,
        canManageUsers: false,
        canAccessReporting: false,
        canAccessSettings: false,
        canAccessKDS: false,
        canViewOwnSchedule: true,
        canClockInOut: true,
        canAccessKitchen: false,
      };
    
    default:
      return getDefaultPermissions();
  }
}

function getDefaultPermissions(): Permissions {
  // Default to no permissions
  return {
    canCreateOwner: false,
    canCreateManager: false,
    canCreateStaff: false,
    canEditOwner: false,
    canEditManager: false,
    canEditStaff: false,
    canDeleteOwner: false,
    canDeleteManager: false,
    canDeleteStaff: false,
    canAccessAdmin: false,
    canManageMenu: false,
    canManageEvents: false,
    canManageSpecials: false,
    canManageAnnouncements: false,
    canManageOrders: false,
    canManageStaff: false,
    canManageUsers: false,
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
  
  const perms = getPermissions(currentUserRole);
  
  switch (targetUserRole) {
    case 'admin':
    case 'superadmin':
      return false; // No one can manage admin or superadmin
    case 'owner':
      return perms.canEditOwner && perms.canDeleteOwner;
    case 'manager':
      return perms.canEditManager && perms.canDeleteManager;
    case 'cook':
    case 'bartender':
    case 'barback':
      return perms.canEditStaff && perms.canDeleteStaff;
    default:
      return false;
  }
}

/**
 * Check if a user can create a user with a specific role
 */
export function canCreateRole(
  currentUserRole: string | null | undefined,
  targetRole: string
): boolean {
  if (!currentUserRole) return false;
  
  const perms = getPermissions(currentUserRole);
  
  switch (targetRole) {
    case 'admin':
    case 'superadmin':
      return false; // No one can create admin or superadmin (only via env/config)
    case 'owner':
      return perms.canCreateOwner;
    case 'manager':
      return perms.canCreateManager;
    case 'cook':
    case 'bartender':
    case 'barback':
      return perms.canCreateStaff;
    default:
      return false;
  }
}

