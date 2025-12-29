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
  FaChevronDown,
  FaChevronRight,
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
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation after mount
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Reset open section when menu closes
      setOpenSection(null);
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

  // Organized navigation sections with collapsible accordion
  const navSections = [
    {
      id: 'overview',
      title: 'Overview',
      items: [
        ...(permissions.canAccessAdmin && featureFlags.calendars_events ? [{ href: '/admin/overview', label: 'Overview', icon: FaHome }] : []),
      ],
    },
    {
      id: 'guest-experience',
      title: 'Guest Experience',
      items: [
        ...(permissions.canAccessAdmin && featureFlags.calendars_events ? [{ href: '/admin', label: 'Calendar & Events', icon: FaCalendarAlt }] : []),
        ...(permissions.canAccessAdmin && featureFlags.homepage_management ? [{ href: '/admin/homepage', label: 'Homepage', icon: FaEdit }] : []),
        ...(permissions.canAccessAdmin && featureFlags.signage_management ? [{ href: '/admin/signage', label: 'Digital Signage', icon: FaGlobe }] : []),
      ],
    },
    {
      id: 'menus-specials',
      title: 'Menus & Specials',
      items: [
        ...(permissions.canManageMenu && featureFlags.menu_management ? [{ href: '/admin/menu', label: 'Menu', icon: FaUtensils }] : []),
        ...(permissions.canManageMenu && featureFlags.specials_management ? [{ href: '/admin/food-specials', label: 'Food Specials', icon: FaDrumstickBite }] : []),
        ...(permissions.canManageMenu && featureFlags.specials_management ? [{ href: '/admin/drink-specials', label: 'Drink Specials', icon: FaWineGlass }] : []),
      ],
    },
    {
      id: 'orders-leads',
      title: 'Orders & Leads',
      items: [
        ...(permissions.canAccessAdmin && featureFlags.online_ordering ? [{ href: '/admin/orders', label: 'Orders', icon: FaCashRegister }] : []),
        ...(permissions.canAccessAdmin ? [{ href: '/admin/private-dining-leads', label: 'Private Dining Leads', icon: FaUsers }] : []),
      ],
    },
    {
      id: 'back-of-house',
      title: 'Back of House',
      items: [
        ...(permissions.canManageStaff && featureFlags.staff_scheduling ? [{ href: '/admin/staff', label: 'Staff Scheduling', icon: FaClock }] : []),
        ...(permissions.canAccessKDS && featureFlags.boh_connections ? [{ href: '/admin/kds', label: 'Kitchen Display', icon: FaUtensils }] : []),
        ...(permissions.canAccessAdmin && featureFlags.boh_connections ? [{ href: '/admin/pos-integrations', label: 'POS Integrations', icon: FaCashRegister }] : []),
        ...(permissions.canAccessAdmin && featureFlags.purchase_orders ? [{ href: '/admin/purchase-orders', label: 'Purchase Orders', icon: FaUtensils }] : []),
        ...(permissions.canAccessAdmin && featureFlags.ingredients_management ? [{ href: '/admin/ingredients', label: 'Ingredients', icon: FaUtensils }] : []),
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing',
      items: [
        ...(permissions.canAccessAdmin && featureFlags.social_media ? [{ href: '/admin/social', label: 'Social Media', icon: FaShareAlt }] : []),
      ],
    },
    {
      id: 'insights',
      title: 'Insights',
      items: [
        ...(permissions.canAccessReporting && featureFlags.reporting_analytics ? [{ href: '/admin/reporting', label: 'Reporting', icon: FaChartLine }] : []),
        ...(permissions.canAccessAdmin && featureFlags.activity_log ? [{ href: '/admin/activity', label: 'Activity', icon: FaHistory }] : []),
      ],
    },
    {
      id: 'administration',
      title: 'Administration',
      items: [
        ...(permissions.canManageUsers && featureFlags.users_staff_management ? [{ href: '/admin/users-staff', label: 'Users & Staff', icon: FaUsers }] : []),
        ...(userRole === 'admin' ? [{ href: '/admin/feature-flags', label: 'Feature Flags', icon: FaCog }] : []),
      ],
    },
    {
      id: 'general',
      title: 'General',
      items: [
        { href: '/', label: 'View Site', icon: FaGlobe, isExternal: true },
      ],
    },
    {
      id: 'settings',
      title: 'Settings',
      items: [
        { type: 'theme-toggle', label: 'Dark Mode', icon: FaMoon },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        { href: '/admin/profile', label: 'Profile', icon: FaUser },
        { type: 'sign-out', label: 'Sign Out', icon: FaSignOutAlt },
      ],
    },
  ].filter(section => section.items.length > 0);

  // Auto-open section if current page is in it
  useEffect(() => {
    if (isOpen && openSection === null) {
      for (const section of navSections) {
        if (section.items.some(item => item.href && isActive(item.href))) {
          setOpenSection(section.id);
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pathname]);

  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/admin/overview') {
      return pathname === '/admin/overview';
    }
    if (href === '/admin?view=list') {
      return pathname === '/admin' || pathname?.startsWith('/admin/events') || pathname?.startsWith('/admin/specials');
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

        {/* Navigation Items - Collapsible Accordion */}
        <nav 
          className="flex-1 p-2.5 space-y-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          {navSections.map((section, sectionIndex) => {
            const isOpen = openSection === section.id;
            const hasActiveItem = section.items.some(item => item.href && isActive(item.href));
            
            return (
              <div key={section.id} className="space-y-0.5">
                {/* Section Header - Collapsible */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSection(section.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-lg transition-all duration-200 ease-out touch-manipulation active:scale-[0.98] ${
                    isOpen || hasActiveItem
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                  }`}
                  style={{
                    pointerEvents: 'auto',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                  }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {section.title}
                  </span>
                  {isOpen ? (
                    <FaChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
                  ) : (
                    <FaChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
                  )}
                </button>

                {/* Section Items - Collapsible Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="space-y-0.5 pt-1">
                    {/* User Info - Show in Account section */}
                    {section.id === 'account' && isOpen && (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 bg-white/50 dark:bg-gray-800/50 ml-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                          {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{userName || 'Admin'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</div>
                        </div>
                      </div>
                    )}
                    
                    {section.items.map((item, idx) => {
                      const active = item.href ? isActive(item.href) : false;
                      const itemKey = item.href || `${'type' in item ? item.type : 'item'}-${idx}`;
                      
                      // Theme Toggle
                      if ('type' in item && item.type === 'theme-toggle') {
                        return (
                          <button
                            key={itemKey}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleTheme();
                            }}
                            className="group w-full flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ml-2 text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800"
                            style={{
                              pointerEvents: isOpen ? 'auto' : 'none',
                              WebkitTapHighlightColor: 'transparent',
                              touchAction: 'manipulation',
                              cursor: 'pointer',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-sm">{item.label}</span>
                            </div>
                            <div className={`relative w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
                              theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                            }`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </div>
                          </button>
                        );
                      }
                      
                      // Sign Out
                      if ('type' in item && item.type === 'sign-out') {
                        return (
                          <button
                            key={itemKey}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onClose();
                              signOut({ callbackUrl: '/' });
                            }}
                            className="group w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ml-2 text-red-500 dark:text-red-400 active:bg-red-50 dark:active:bg-red-900/20"
                            style={{
                              pointerEvents: isOpen ? 'auto' : 'none',
                              WebkitTapHighlightColor: 'transparent',
                              touchAction: 'manipulation',
                              cursor: 'pointer',
                            }}
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium text-sm flex-1">{item.label}</span>
                          </button>
                        );
                      }
                      
                      // Regular navigation items or external links
                      if ('isExternal' in item && item.isExternal) {
                        return (
                          <Link
                            key={itemKey}
                            href={item.href}
                            target="_blank"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                            }}
                            className={`group w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ml-2 ${
                              active
                                ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                            }`}
                            style={{
                              pointerEvents: isOpen ? 'auto' : 'none',
                              WebkitTapHighlightColor: 'transparent',
                              touchAction: 'manipulation',
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
                          </Link>
                        );
                      }
                      
                      // Regular navigation item
                      if (!item.href) return null;
                      return (
                        <button
                          key={itemKey}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const href = item.href;
                            onClose();
                            setTimeout(() => {
                              window.location.href = href;
                            }, 100);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const href = item.href;
                            onClose();
                            setTimeout(() => {
                              window.location.href = href;
                            }, 100);
                          }}
                          className={`group w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg transition-all duration-200 ease-out relative touch-manipulation active:scale-[0.98] text-left ml-2 ${
                            active
                              ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                          }`}
                          style={{
                            pointerEvents: isOpen ? 'auto' : 'none',
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation',
                            position: 'relative',
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
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );

  // Render to body to avoid any z-index/layout issues
  if (typeof window !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return null;
}

