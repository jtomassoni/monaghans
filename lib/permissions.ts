/**
 * Permission system for role-based access control
 * 
 * Roles:
 * - admin: Highest role, full access to all features
 * - owner: Full admin access (same as admin for now)
 */

export type UserRole = 'admin' | 'owner';

export interface Permissions {
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

