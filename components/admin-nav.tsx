'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { 
  FaCalendarAlt, 
  FaStar, 
  FaUtensils, 
  FaCog, 
  FaUsers, 
  FaBeer, 
  FaGlobe, 
  FaSignOutAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
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
  FaTv
} from 'react-icons/fa';
import { useTheme } from './theme-provider';
import { useEffect } from 'react';
import AdminMobileHeader from './admin-mobile-header';
import AdminMobileMenu from './admin-mobile-menu';

interface AdminNavProps {
  isSuperadmin: boolean;
  userName?: string;
  userEmail?: string;
}

export default function AdminNav({ isSuperadmin, userName, userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Close mobile menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

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

  const navItems = [
    { href: '/admin/overview', label: 'Overview', icon: FaHome },
    { href: '/admin', label: 'Calendar', icon: FaCalendarAlt },
    { href: '/admin/specials-events', label: 'Events', icon: FaStar },
    { href: '/admin/announcements', label: 'Announcements', icon: FaBullhorn },
    { href: '/admin/menu', label: 'Menu', icon: FaUtensils },
    { href: '/admin/orders', label: 'Orders', icon: FaShoppingCart },
    { href: '/admin/kds', label: 'Kitchen Display', icon: FaTv },
    { href: '/admin/homepage', label: 'Homepage', icon: FaEdit },
    { href: '/admin/social', label: 'Social Media', icon: FaShareAlt },
    { href: '/admin/reporting', label: 'Reporting', icon: FaChartLine },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/admin/overview') {
      return pathname === '/admin/overview';
    }
    if (href === '/admin/specials-events') {
      return pathname?.startsWith('/admin/specials') || pathname?.startsWith('/admin/events');
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
    return pathname?.startsWith(href);
  };

  const navContent = (
    <>
      {/* Logo/Brand */}
      <div className={`border-b border-gray-200 dark:border-gray-700 relative ${sidebarCompact ? 'p-3' : 'p-4 md:p-6'}`}>
        <div className="flex items-center justify-between gap-2">
          <Link 
            href="/admin" 
            className="flex items-center gap-3 group cursor-pointer flex-1 min-w-0" 
            onClick={closeMobileMenu}
          >
            <div className="text-3xl group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <FaBeer className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="min-w-0">
              <div className={`font-bold text-gray-900 dark:text-white ${sidebarCompact ? 'text-lg' : 'text-xl'}`}>Monaghan&apos;s</div>
              <div className={`text-gray-600 dark:text-gray-400 ${sidebarCompact ? 'text-[10px]' : 'text-xs'}`}>Admin Panel</div>
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
        {/* Desktop compact/expand button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSidebarCompact(!sidebarCompact);
          }}
          className="hidden md:block absolute -right-3 top-6 p-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 z-30"
          aria-label={sidebarCompact ? 'Expand sidebar' : 'Make sidebar compact'}
          type="button"
        >
          {sidebarCompact ? (
            <FaChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <FaChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-2 overflow-y-auto ${sidebarCompact ? 'p-2' : 'p-4'}`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobileMenu}
            className={`flex items-center gap-3 ${sidebarCompact ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 group cursor-pointer ${
              isActive(item.href)
                ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <item.icon className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <span className={`font-medium ${sidebarCompact ? 'text-sm' : ''}`}>{item.label}</span>
          </Link>
        ))}

        {isSuperadmin && (
          <Link
            href="/admin/users"
            onClick={closeMobileMenu}
            className={`flex items-center gap-3 ${sidebarCompact ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 group cursor-pointer ${
              isActive('/admin/users')
                ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FaUsers className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <span className={`font-medium ${sidebarCompact ? 'text-sm' : ''}`}>Users</span>
          </Link>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className={`border-t border-gray-200 dark:border-gray-700 space-y-2 ${sidebarCompact ? 'p-2' : 'p-4'}`}>
        <Link
          href="/admin/activity"
          onClick={(e) => {
            e.stopPropagation();
            closeMobileMenu();
          }}
          className={`flex items-center gap-3 ${sidebarCompact ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 group cursor-pointer ${
            isActive('/admin/activity')
              ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FaHistory className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span className={`font-medium ${sidebarCompact ? 'text-sm' : ''}`}>Activity</span>
        </Link>

        <Link
          href="/admin/settings"
          onClick={(e) => {
            e.stopPropagation();
            closeMobileMenu();
          }}
          className={`flex items-center gap-3 ${sidebarCompact ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl transition-all duration-200 group cursor-pointer ${
            isActive('/admin/settings')
              ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FaCog className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span className={`font-medium ${sidebarCompact ? 'text-sm' : ''}`}>Settings</span>
        </Link>

        <Link
          href="/"
          target="_blank"
          onClick={(e) => {
            e.stopPropagation();
            closeMobileMenu();
          }}
          className={`flex items-center gap-3 ${sidebarCompact ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group cursor-pointer`}
        >
          <FaGlobe className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span className={`font-medium ${sidebarCompact ? 'text-sm' : ''}`}>View Site</span>
          <FaExternalLinkAlt className="ml-auto w-3 h-3 flex-shrink-0" />
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            toggleTheme();
            closeMobileMenu();
          }}
          className={`w-full flex items-center justify-between gap-3 ${sidebarCompact ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group cursor-pointer`}
          aria-label={theme === 'dark' ? 'Dark mode on' : 'Dark mode off'}
        >
          <div className="flex items-center gap-3">
            <FaMoon className={`group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ${sidebarCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <span className={`font-medium ${sidebarCompact ? 'text-sm' : ''}`}>Dark Mode</span>
          </div>
          <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
            theme === 'dark' ? 'bg-blue-500 dark:bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md ${
              theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </div>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              // Don't close menu on user menu click, let user interact with dropdown
            }}
            className={`w-full flex items-center gap-3 ${sidebarCompact ? 'px-2 py-2' : 'px-4 py-3'} rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group`}
          >
            <div className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0 ${sidebarCompact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}`}>
              {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className={`font-medium text-gray-900 dark:text-white truncate ${sidebarCompact ? 'text-xs' : 'text-sm'}`}>{userName || 'Admin'}</div>
              {!sidebarCompact && (
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{userEmail}</div>
              )}
            </div>
            <FaChevronDown className={`w-3 h-3 transition-transform duration-200 flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-10 min-w-[140px]">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  closeMobileMenu();
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full px-4 py-3 text-left text-red-400 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
              >
                <FaSignOutAlt className="w-4 h-4 flex-shrink-0" />
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
        isSuperadmin={isSuperadmin}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 relative z-20 transition-all duration-300 ease-in-out ${
        sidebarCompact ? 'w-52' : 'w-64'
      }`}>
        {navContent}
      </aside>
    </>
  );
}

