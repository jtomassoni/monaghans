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
  FaExternalLinkAlt,
  FaHome,
  FaEdit,
  FaMoon,
  FaSun,
  FaBullhorn,
  FaHistory
} from 'react-icons/fa';
import { useTheme } from './theme-provider';

interface AdminNavProps {
  isSuperadmin: boolean;
  userName?: string;
  userEmail?: string;
}

export default function AdminNav({ isSuperadmin, userName, userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: '/admin/overview', label: 'Overview', icon: FaHome },
    { href: '/admin', label: 'Calendar', icon: FaCalendarAlt },
    { href: '/admin/specials-events', label: 'Events', icon: FaStar },
    { href: '/admin/announcements', label: 'Announcements', icon: FaBullhorn },
    { href: '/admin/menu', label: 'Menu', icon: FaUtensils },
    { href: '/admin/homepage', label: 'Homepage', icon: FaEdit },
    { href: '/admin/activity', label: 'Activity', icon: FaHistory },
    { href: '/admin/settings', label: 'Settings', icon: FaCog },
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
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 relative z-20">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <Link href="/admin" className="flex items-center gap-3 group cursor-pointer">
          <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
            <FaBeer className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">Monaghan&apos;s</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Admin Panel</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
              isActive(item.href)
                ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}

        {isSuperadmin && (
          <Link
            href="/admin/users"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
              isActive('/admin/users')
                ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white border border-blue-400 dark:border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FaUsers className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            <span className="font-medium">Users</span>
          </Link>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group cursor-pointer"
        >
          <FaGlobe className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span className="font-medium">View Site</span>
          <FaExternalLinkAlt className="ml-auto w-3 h-3" />
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <>
              <FaMoon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">Dark Mode</span>
            </>
          ) : (
            <>
              <FaSun className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">Light Mode</span>
            </>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{userName || 'Admin'}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{userEmail}</div>
            </div>
            <FaChevronDown className={`w-3 h-3 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full px-4 py-3 text-left text-red-400 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
              >
                <FaSignOutAlt className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

