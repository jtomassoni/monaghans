'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  FaCalendarAlt,
  FaStar,
  FaUtensils,
  FaCog,
  FaUsers,
  FaUser,
  FaBeer,
  FaGlobe,
  FaSignOutAlt,
  FaHome,
  FaEdit,
  FaMoon,
  FaHistory,
  FaShareAlt,
  FaTimes,
  FaChartLine,
  FaClock,
  FaCashRegister,
  FaDrumstickBite,
  FaWineGlass,
} from 'react-icons/fa';
import { useTheme } from './theme-provider';
import { getPermissions } from '@/lib/permissions';
import { useFeatureFlags } from '@/lib/use-feature-flags';

interface AdminMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  userName?: string;
  userEmail?: string;
}

export default function AdminMobileMenu({
  isOpen,
  onClose,
  userRole,
  userName,
  userEmail,
}: AdminMobileMenuProps) {
  const permissions = getPermissions(userRole);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const { flags: featureFlags } = useFeatureFlags();

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation after mount
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Frequently used items - shown prominently at top
  const quickActions = [
    ...(permissions.canAccessAdmin && featureFlags.calendars_events ? [{ href: '/admin', label: 'Calendar', icon: FaCalendarAlt }] : []),
    ...(permissions.canManageMenu && featureFlags.specials_management ? [{ href: '/admin/food-specials', label: 'Food Specials', icon: FaDrumstickBite }] : []),
    ...(permissions.canManageMenu && featureFlags.specials_management ? [{ href: '/admin/drink-specials', label: 'Drink Specials', icon: FaWineGlass }] : []),
    ...(permissions.canManageMenu && featureFlags.menu_management ? [{ href: '/admin/menu', label: 'Menu', icon: FaUtensils }] : []),
    ...(permissions.canManageEvents && featureFlags.calendars_events ? [{ href: '/admin/specials-events', label: 'Events', icon: FaStar }] : []),
  ].filter(Boolean);

  // Other navigation groups - shown below quick actions
  const navGroups = [
    {
      title: 'More',
      items: [
        ...(permissions.canAccessAdmin && featureFlags.calendars_events ? [{ href: '/admin/overview', label: 'Overview', icon: FaHome }] : []),
        ...(permissions.canAccessAdmin && featureFlags.homepage_management ? [{ href: '/admin/homepage', label: 'Homepage', icon: FaEdit }] : []),
        ...(permissions.canManageStaff && featureFlags.staff_scheduling ? [{ href: '/admin/staff', label: 'Scheduling', icon: FaClock }] : []),
        ...(permissions.canAccessAdmin && featureFlags.online_ordering ? [{ href: '/admin/orders', label: 'Orders', icon: FaCashRegister }] : []),
        ...(permissions.canAccessAdmin && featureFlags.social_media ? [{ href: '/admin/social', label: 'Social Media', icon: FaShareAlt }] : []),
        ...(permissions.canAccessReporting && featureFlags.reporting_analytics ? [{ href: '/admin/reporting', label: 'Reporting', icon: FaChartLine }] : []),
        ...(permissions.canAccessKDS && featureFlags.boh_connections ? [{ href: '/admin/kds', label: 'Kitchen Display', icon: FaUtensils }] : []),
        ...(permissions.canAccessAdmin && featureFlags.boh_connections ? [{ href: '/admin/pos-integrations', label: 'POS Integrations', icon: FaCashRegister }] : []),
        ...(permissions.canAccessAdmin && featureFlags.purchase_orders ? [{ href: '/admin/purchase-orders', label: 'Purchase Orders', icon: FaUtensils }] : []),
        ...(permissions.canAccessAdmin && featureFlags.ingredients_management ? [{ href: '/admin/ingredients', label: 'Ingredients', icon: FaUtensils }] : []),
      ],
    },
  ].filter(group => group.items.length > 0);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/admin/overview') {
      return pathname === '/admin/overview';
    }
    if (href === '/admin/specials-events') {
      return pathname?.startsWith('/admin/specials-events') || pathname?.startsWith('/admin/events');
    }
    if (href === '/admin/food-specials') {
      return pathname?.startsWith('/admin/food-specials');
    }
    if (href === '/admin/drink-specials') {
      return pathname?.startsWith('/admin/drink-specials');
    }
    if (href === '/admin/activity') {
      return pathname === '/admin/activity';
    }
    if (href === '/admin/social') {
      return pathname?.startsWith('/admin/social');
    }
    if (href === '/admin/kds') {
      return pathname?.startsWith('/admin/kds');
    }
    return pathname?.startsWith(href);
  };

  if (!isOpen && !isAnimating) return null;

  const menuContent = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 dark:bg-black/90 transition-opacity duration-300 ease-out backdrop-blur-sm ${
          isOpen && isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: isOpen && isAnimating ? 'auto' : 'none',
        }}
      />

      {/* Menu Panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen && isAnimating ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          zIndex: 10000,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Menu panel clicked'); // Debug
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          console.log('Menu panel touched'); // Debug
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <FaBeer className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-base text-gray-900 dark:text-white truncate">Monaghan&apos;s</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close menu"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav 
          className="flex-1 p-2.5 space-y-2.5 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Actions - Frequently Used Items */}
          {quickActions.length > 0 && (
            <div className="space-y-1 pb-2 border-b border-gray-200 dark:border-gray-800">
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quick Actions
              </div>
              {quickActions.map((item, idx) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const href = item.href;
                      console.log('Menu item clicked:', href); // Debug
                      onClose();
                      setTimeout(() => {
                        window.location.href = href;
                      }, 100);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      console.log('Menu item touched:', item.href); // Debug
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const href = item.href;
                      console.log('Menu item touch end:', href); // Debug
                      onClose();
                      setTimeout(() => {
                        window.location.href = href;
                      }, 100);
                    }}
                    className={`group w-full flex items-center gap-3 px-3 py-3.5 min-h-[48px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ${
                      active
                        ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                    } ${
                      isOpen && isAnimating
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-4'
                    }`}
                    style={{
                      transitionDelay: `${idx * 15}ms`,
                      pointerEvents: isOpen ? 'auto' : 'none',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      position: 'relative',
                      zIndex: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {active && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
                    )}
                    <item.icon className={`w-5 h-5 transition-colors flex-shrink-0 ${
                      active
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 group-active:text-gray-700 dark:group-active:text-gray-300'
                    }`} />
                    <span className={`font-semibold text-sm flex-1 ${
                      active ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Other Navigation Groups */}
          {navGroups.map((group, groupIndex) => {
            let itemIndex = 0;
            navGroups.slice(0, groupIndex).forEach(g => itemIndex += g.items.length);
            
            return (
              <div key={group.title} className="space-y-1">
                <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.title}
                </div>
                {group.items.map((item, idx) => {
                  const active = isActive(item.href);
                  const delay = (itemIndex + idx) * 20;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const href = item.href;
                        console.log('Menu item clicked:', href); // Debug
                        onClose();
                        // Use window.location for more reliable navigation
                        setTimeout(() => {
                          window.location.href = href;
                        }, 100);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        console.log('Menu item touched:', item.href); // Debug
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const href = item.href;
                        console.log('Menu item touch end:', href); // Debug
                        onClose();
                        setTimeout(() => {
                          window.location.href = href;
                        }, 100);
                      }}
                      className={`group w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ${
                        active
                          ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                      } ${
                        isOpen && isAnimating
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-4'
                      }`}
                      style={{
                        transitionDelay: `${delay}ms`,
                        pointerEvents: isOpen ? 'auto' : 'none',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        position: 'relative',
                        zIndex: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {active && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
                      )}
                      <item.icon className={`w-5 h-5 transition-colors flex-shrink-0 ${
                        active
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400 group-active:text-gray-700 dark:group-active:text-gray-300'
                      }`} />
                      <span className={`font-medium text-sm flex-1 ${
                        active ? 'text-blue-600 dark:text-blue-400' : ''
                      }`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Administration section */}
          {permissions.canManageUsers && featureFlags.users_staff_management && (
            <div className="space-y-1 pt-2">
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Administration
              </div>
              {(() => {
                const totalItems = quickActions.length + navGroups.reduce((sum, g) => sum + g.items.length, 0);
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose();
                      setTimeout(() => {
                        router.push('/admin/users-staff');
                      }, 50);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                    }}
                    className={`group w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ${
                      isActive('/admin/users-staff') || isActive('/admin/users')
                        ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                    } ${
                      isOpen && isAnimating
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-4'
                    }`}
                    style={{
                      transitionDelay: `${totalItems * 20}ms`,
                      pointerEvents: 'auto',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {(isActive('/admin/users-staff') || isActive('/admin/users')) && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
                    )}
                    <FaUsers className={`w-5 h-5 transition-colors flex-shrink-0 ${
                      isActive('/admin/users-staff') || isActive('/admin/users')
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 group-active:text-gray-700 dark:group-active:text-gray-300'
                    }`} />
                    <span className={`font-medium text-sm flex-1 ${
                      (isActive('/admin/users-staff') || isActive('/admin/users')) ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}>Users & Staff</span>
                  </button>
                );
              })()}
            </div>
          )}
          
          {/* Feature Flags - Admin only */}
          {userRole === 'admin' && (
            <div className="space-y-1 pt-2">
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Administration
              </div>
              {(() => {
                const totalItems = quickActions.length + navGroups.reduce((sum, g) => sum + g.items.length, 0) + (permissions.canManageUsers && featureFlags.users_staff_management ? 1 : 0);
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose();
                      setTimeout(() => {
                        router.push('/admin/feature-flags');
                      }, 50);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                    }}
                    className={`group w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ${
                      isActive('/admin/feature-flags')
                        ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                    } ${
                      isOpen && isAnimating
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-4'
                    }`}
                    style={{
                      transitionDelay: `${totalItems * 20}ms`,
                      pointerEvents: 'auto',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {isActive('/admin/feature-flags') && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
                    )}
                    <FaCog className={`w-5 h-5 transition-colors flex-shrink-0 ${
                      isActive('/admin/feature-flags')
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 group-active:text-gray-700 dark:group-active:text-gray-300'
                    }`} />
                    <span className={`font-medium text-sm flex-1 ${
                      isActive('/admin/feature-flags') ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}>Feature Flags</span>
                  </button>
                );
              })()}
            </div>
          )}
        </nav>

        {/* Bottom Section - Essential Actions Only */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-2.5 space-y-1 flex-shrink-0 bg-gray-50/30 dark:bg-gray-800/30">

          <Link
            href="/"
            target="_blank"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`group flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 transition-all duration-200 ease-out touch-manipulation active:scale-[0.98] ${
              isOpen && isAnimating
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            }`}
            style={{
              transitionDelay: `${(quickActions.length + navGroups.reduce((sum, g) => sum + g.items.length, 0) + (permissions.canManageUsers && featureFlags.users_staff_management ? 1 : 0) + (userRole === 'admin' ? 1 : 0)) * 20 + 30}ms`,
            }}
          >
            <FaGlobe className="w-5 h-5 text-gray-500 dark:text-gray-400 group-active:text-gray-700 dark:group-active:text-gray-300 transition-colors flex-shrink-0" />
            <span className="font-medium text-sm flex-1">View Site</span>
          </Link>

          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 transition-all duration-200 ease-out touch-manipulation active:scale-[0.98] ${
              isOpen && isAnimating
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            }`}
            style={{
              transitionDelay: `${(quickActions.length + navGroups.reduce((sum, g) => sum + g.items.length, 0) + (permissions.canManageUsers && featureFlags.users_staff_management ? 1 : 0) + (userRole === 'admin' ? 1 : 0)) * 20 + 50}ms`,
            }}
          >
            <div className="flex items-center gap-3">
              <FaMoon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="font-medium text-sm">Dark Mode</span>
            </div>
            <div className={`relative w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
              theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </button>

          <div className={`pt-3 mt-3 border-t border-gray-200 dark:border-gray-800 transition-all duration-200 ease-out ${
            isOpen && isAnimating
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-4'
          }`}
          style={{
            transitionDelay: `${(quickActions.length + navGroups.reduce((sum, g) => sum + g.items.length, 0) + (permissions.canManageUsers && featureFlags.users_staff_management ? 1 : 0) + (userRole === 'admin' ? 1 : 0)) * 20 + 70}ms`,
          }}>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 bg-white/50 dark:bg-gray-800/50">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{userName || 'Admin'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
                setTimeout(() => {
                  router.push('/admin/profile');
                }, 50);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 transition-all duration-200 ease-out mb-1 touch-manipulation active:scale-[0.98] text-left"
              style={{
                pointerEvents: 'auto',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <FaUser className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">Profile</span>
            </button>
            <button
              onClick={() => {
                onClose();
                signOut({ callbackUrl: '/' });
              }}
              className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-red-500 dark:text-red-400 active:bg-red-50 dark:active:bg-red-900/20 transition-all duration-200 ease-out touch-manipulation active:scale-[0.98]"
            >
              <FaSignOutAlt className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Render to body to avoid any z-index/layout issues
  if (typeof window !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return null;
}

