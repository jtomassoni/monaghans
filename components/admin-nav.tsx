'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, useRef } from 'react';
import { 
  FaCalendarAlt, 
  FaStar, 
  FaUtensils, 
  FaUsers, 
  FaUser,
  FaBeer, 
  FaGlobe, 
  FaSignOutAlt,
  FaChevronDown,
  FaExternalLinkAlt,
  FaHome,
  FaEdit,
  FaMoon,
  FaBullhorn,
  FaHistory,
  FaFacebook,
  FaShareAlt,
  FaBars,
  FaTimes,
  FaChartLine,
  FaShoppingCart,
  FaTv,
  FaClock,
  FaCashRegister,
  FaTruck,
  FaFileInvoiceDollar,
  FaDrumstickBite,
  FaWineGlass
} from 'react-icons/fa';
import { useTheme } from './theme-provider';
import { useEffect } from 'react';
import AdminMobileHeader from './admin-mobile-header';
import AdminMobileMenu from './admin-mobile-menu';
import { getPermissions } from '@/lib/permissions';

interface AdminNavProps {
  userRole: string;
  userName?: string;
  userEmail?: string;
}

export default function AdminNav({ userRole, userName, userEmail }: AdminNavProps) {
  const permissions = getPermissions(userRole);
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Close mobile menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Auto-compact sidebar on portrait orientation for better vertical monitor support
  useEffect(() => {
    const handleResize = () => {
      // Check if height > width (portrait mode) and width is small enough
      if (window.innerHeight > window.innerWidth && window.innerWidth < 1200) {
        setSidebarCompact(true);
      } else if (window.innerWidth >= 1200) {
        // Auto-expand on larger landscape screens
        setSidebarCompact(false);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navGroups = [
    {
      title: 'Dashboard',
      items: [
        ...(permissions.canAccessAdmin ? [{ href: '/admin/overview', label: 'Overview', icon: FaHome }] : []),
      ],
    },
    {
      title: 'Content',
      items: [
        ...(permissions.canAccessAdmin ? [{ href: '/admin', label: 'Calendar', icon: FaCalendarAlt }] : []),
        ...(permissions.canManageEvents ? [{ href: '/admin/specials-events', label: 'Events', icon: FaStar }] : []),
        ...(permissions.canManageAnnouncements ? [{ href: '/admin/announcements', label: 'Announcements', icon: FaBullhorn }] : []),
        ...(permissions.canAccessAdmin ? [{ href: '/admin/homepage', label: 'Homepage', icon: FaEdit }] : []),
      ],
    },
    {
      title: 'Specials',
      items: [
        ...(permissions.canManageMenu ? [{ href: '/admin/food-specials', label: 'Food Specials', icon: FaDrumstickBite }] : []),
        ...(permissions.canManageMenu ? [{ href: '/admin/drink-specials', label: 'Drink Specials', icon: FaWineGlass }] : []),
      ],
    },
    {
      title: 'Operations',
      items: [
        ...(permissions.canManageMenu ? [{ href: '/admin/menu', label: 'Menu', icon: FaUtensils }] : []),
        ...(permissions.canManageOrders ? [{ href: '/admin/orders', label: 'Orders', icon: FaShoppingCart }] : []),
        ...(permissions.canAccessKDS ? [{ href: '/admin/kds', label: 'Kitchen Display', icon: FaTv }] : []),
        ...(permissions.canManageStaff ? [{ href: '/admin/staff', label: 'Scheduling', icon: FaClock }] : []),
        ...(permissions.canAccessAdmin ? [{ href: '/admin/suppliers', label: 'Suppliers', icon: FaTruck }] : []),
        ...(permissions.canAccessAdmin ? [{ href: '/admin/purchase-orders', label: 'Purchase Orders', icon: FaFileInvoiceDollar }] : []),
      ],
    },
    {
      title: 'Marketing',
      items: [
        ...(permissions.canAccessAdmin ? [{ href: '/admin/social', label: 'Social Media', icon: FaShareAlt }] : []),
      ],
    },
    {
      title: 'Analytics',
      items: [
        ...(permissions.canAccessReporting ? [{ href: '/admin/reporting', label: 'Reporting', icon: FaChartLine }] : []),
        ...(permissions.canAccessAdmin ? [{ href: '/admin/pos-integrations', label: 'POS Integrations', icon: FaCashRegister }] : []),
      ],
    },
  ].filter(group => group.items.length > 0); // Remove empty groups

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
    if (href === '/admin/announcements') {
      return pathname?.startsWith('/admin/announcements');
    }
    if (href === '/admin/activity') {
      return pathname === '/admin/activity';
    }
    if (href === '/admin/social') {
      return pathname?.startsWith('/admin/social');
    }
    if (href === '/admin/reporting') {
      return pathname?.startsWith('/admin/reporting');
    }
    if (href === '/admin/orders') {
      return pathname?.startsWith('/admin/orders');
    }
    if (href === '/admin/kds') {
      return pathname?.startsWith('/admin/kds');
    }
    if (href === '/admin/staff') {
      return pathname?.startsWith('/admin/staff');
    }
    if (href === '/admin/pos-integrations') {
      return pathname?.startsWith('/admin/pos-integrations');
    }
    if (href === '/admin/suppliers') {
      return pathname?.startsWith('/admin/suppliers');
    }
    if (href === '/admin/purchase-orders') {
      return pathname?.startsWith('/admin/purchase-orders');
    }
    return pathname?.startsWith(href);
  };

  const navContent = (
    <>
      {/* Logo/Brand */}
      <div className={`border-b border-gray-200 dark:border-gray-700 relative ${sidebarCompact ? 'p-2' : 'p-3'}`}>
        <div className="flex items-center justify-between gap-2">
          <Link 
            href="/admin" 
            className="flex items-center gap-2 group cursor-pointer flex-1 min-w-0" 
            onClick={closeMobileMenu}
          >
            <div className="text-3xl group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <FaBeer className={`text-yellow-400 ${sidebarCompact ? 'w-5 h-5' : 'w-6 h-6'}`} />
            </div>
            <div className="min-w-0">
              <div className={`font-bold text-gray-900 dark:text-white ${sidebarCompact ? 'text-sm' : 'text-base'}`}>Monaghan&apos;s</div>
              <div className={`text-gray-600 dark:text-gray-400 ${sidebarCompact ? 'text-[9px]' : 'text-[10px]'}`}>Admin Panel</div>
            </div>
          </Link>
          {/* Close button - mobile only */}
          <button
            onClick={closeMobileMenu}
            className="md:hidden p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 dark:active:bg-gray-700 text-gray-700 dark:text-gray-300 touch-manipulation flex-shrink-0 cursor-pointer"
            aria-label="Close sidebar"
            type="button"
          >
            <FaTimes className="w-6 h-6 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-2 overflow-y-auto ${sidebarCompact ? 'p-1.5' : 'p-2'} min-h-0`}>
        {navGroups.length > 0 ? (
          navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!sidebarCompact && (
                <div className={`px-3 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                  {group.title}
                </div>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-2 ${sidebarCompact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg transition-all duration-200 group cursor-pointer ${
                    isActive(item.href)
                      ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                  <span className={`font-medium ${sidebarCompact ? 'text-xs' : 'text-sm'}`}>{item.label}</span>
                </Link>
              ))}
            </div>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            No navigation items available
          </div>
        )}

        {/* Administration section */}
        {permissions.canManageUsers && (
          <div className="space-y-1 pt-1">
            {!sidebarCompact && (
              <div className={`px-3 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                Administration
              </div>
            )}
            <Link
              href="/admin/users-staff"
              onClick={closeMobileMenu}
              className={`flex items-center gap-2 ${sidebarCompact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg transition-all duration-200 group cursor-pointer ${
                isActive('/admin/users-staff') || isActive('/admin/users')
                  ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FaUsers className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              <span className={`font-medium ${sidebarCompact ? 'text-xs' : 'text-sm'}`}>Users & Staff</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className={`border-t border-gray-200 dark:border-gray-700 space-y-1 ${sidebarCompact ? 'p-1.5' : 'p-2'}`}>
        {permissions.canAccessAdmin && (
          <Link
            href="/admin/activity"
            onClick={(e) => {
              e.stopPropagation();
              closeMobileMenu();
            }}
            className={`flex items-center gap-2 ${sidebarCompact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg transition-all duration-200 group cursor-pointer ${
              isActive('/admin/activity')
                ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FaHistory className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            <span className={`font-medium ${sidebarCompact ? 'text-xs' : 'text-sm'}`}>Activity</span>
          </Link>
        )}

        <Link
          href="/"
          target="_blank"
          onClick={(e) => {
            e.stopPropagation();
            closeMobileMenu();
          }}
          className={`flex items-center gap-2 ${sidebarCompact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group cursor-pointer`}
        >
          <FaGlobe className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          <span className={`font-medium ${sidebarCompact ? 'text-xs' : 'text-sm'}`}>View Site</span>
          <FaExternalLinkAlt className="ml-auto w-2.5 h-2.5 flex-shrink-0" />
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            toggleTheme();
            closeMobileMenu();
          }}
          className={`w-full flex items-center justify-between gap-2 ${sidebarCompact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group cursor-pointer`}
          aria-label={theme === 'dark' ? 'Dark mode on' : 'Dark mode off'}
        >
          <div className="flex items-center gap-2">
            <FaMoon className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            <span className={`font-medium ${sidebarCompact ? 'text-xs' : 'text-sm'}`}>Dark Mode</span>
          </div>
          <div className={`relative rounded-full transition-colors duration-200 ${
            theme === 'dark' ? 'bg-blue-500 dark:bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'
          } ${sidebarCompact ? 'w-8 h-4' : 'w-9 h-5'}`}>
            <div className={`absolute top-0.5 left-0.5 rounded-full bg-white transition-transform duration-200 shadow-md ${
              theme === 'dark' ? (sidebarCompact ? 'translate-x-4' : 'translate-x-4') : 'translate-x-0'
            } ${sidebarCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </div>
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              // Don't close menu on user menu click, let user interact with dropdown
            }}
            className={`w-full flex items-center gap-2 ${sidebarCompact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group`}
          >
            <div className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0 ${sidebarCompact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'}`}>
              {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className={`font-medium text-gray-900 dark:text-white truncate ${sidebarCompact ? 'text-xs' : 'text-sm'}`}>{userName || 'Admin'}</div>
              {!sidebarCompact && (
                <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate">{userEmail}</div>
              )}
            </div>
            <FaChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-10 min-w-[120px]">
              <Link
                href="/portal"
                onClick={() => {
                  setShowUserMenu(false);
                  closeMobileMenu();
                }}
                className="w-full px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2 text-sm"
              >
                <FaUser className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Profile</span>
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  closeMobileMenu();
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full px-3 py-2 text-left text-red-400 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2 text-sm"
              >
                <FaSignOutAlt className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <AdminMobileHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Mobile Menu - Brand new implementation */}
      <AdminMobileMenu
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 relative z-20 transition-all duration-300 ease-in-out ${
        sidebarCompact ? 'w-52' : 'w-64'
      }`}>
        {navContent}
      </aside>
    </>
  );
}

