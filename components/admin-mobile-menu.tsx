'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  FaCalendarAlt,
  FaStar,
  FaUtensils,
  FaCog,
  FaUsers,
  FaBeer,
  FaGlobe,
  FaSignOutAlt,
  FaHome,
  FaEdit,
  FaMoon,
  FaBullhorn,
  FaHistory,
  FaShareAlt,
  FaTimes,
  FaChartLine,
  FaShoppingCart,
  FaTv,
} from 'react-icons/fa';
import { useTheme } from './theme-provider';

interface AdminMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperadmin: boolean;
  userName?: string;
  userEmail?: string;
}

export default function AdminMobileMenu({
  isOpen,
  onClose,
  isSuperadmin,
  userName,
  userEmail,
}: AdminMobileMenuProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

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
        className={`fixed inset-0 bg-black/70 z-[9998] transition-opacity duration-300 ease-out ${
          isOpen && isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
        }}
      />

      {/* Menu Panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl z-[9999] flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen && isAnimating ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          width: '18rem',
          zIndex: 9999,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <FaBeer className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900 dark:text-white">Monaghan&apos;s</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Admin Panel</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close menu"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
          {navItems.map((item, index) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ease-out relative ${
                  active
                    ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                } ${
                  isOpen && isAnimating
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-4'
                }`}
                style={{
                  transitionDelay: `${index * 30}ms`,
                }}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
                )}
                <item.icon className={`w-4 h-4 transition-colors flex-shrink-0 ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`} />
                <span className={`font-medium text-sm flex-1 ${
                  active ? 'text-blue-600 dark:text-blue-400' : ''
                }`}>{item.label}</span>
              </Link>
            );
          })}

          {isSuperadmin && (
            <Link
              href="/admin/users"
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ease-out relative ${
                isActive('/admin/users')
                  ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
              } ${
                isOpen && isAnimating
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-4'
              }`}
              style={{
                transitionDelay: `${navItems.length * 30}ms`,
              }}
            >
              {isActive('/admin/users') && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
              )}
              <FaUsers className={`w-4 h-4 transition-colors flex-shrink-0 ${
                isActive('/admin/users')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              }`} />
              <span className={`font-medium text-sm flex-1 ${
                isActive('/admin/users') ? 'text-blue-600 dark:text-blue-400' : ''
              }`}>Users</span>
            </Link>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-0.5 flex-shrink-0">
          <Link
            href="/admin/activity"
            onClick={onClose}
            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ease-out relative ${
              isActive('/admin/activity')
                ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            } ${
              isOpen && isAnimating
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            }`}
            style={{
              transitionDelay: `${(navItems.length + (isSuperadmin ? 1 : 0)) * 30 + 50}ms`,
            }}
          >
            {isActive('/admin/activity') && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
            )}
            <FaHistory className={`w-4 h-4 transition-colors flex-shrink-0 ${
              isActive('/admin/activity')
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
            }`} />
            <span className={`font-medium text-sm flex-1 ${
              isActive('/admin/activity') ? 'text-blue-600 dark:text-blue-400' : ''
            }`}>Activity</span>
          </Link>

          <Link
            href="/admin/settings"
            onClick={onClose}
            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ease-out relative ${
              isActive('/admin/settings')
                ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            } ${
              isOpen && isAnimating
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            }`}
            style={{
              transitionDelay: `${(navItems.length + (isSuperadmin ? 1 : 0)) * 30 + 80}ms`,
            }}
          >
            {isActive('/admin/settings') && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400 rounded-r-full" />
            )}
            <FaCog className={`w-4 h-4 transition-colors flex-shrink-0 ${
              isActive('/admin/settings')
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
            }`} />
            <span className={`font-medium text-sm flex-1 ${
              isActive('/admin/settings') ? 'text-blue-600 dark:text-blue-400' : ''
            }`}>Settings</span>
          </Link>

          <Link
            href="/"
            target="_blank"
            onClick={onClose}
            className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200 ease-out ${
              isOpen && isAnimating
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            }`}
            style={{
              transitionDelay: `${(navItems.length + (isSuperadmin ? 1 : 0)) * 30 + 110}ms`,
            }}
          >
            <FaGlobe className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
            <span className="font-medium text-sm flex-1">View Site</span>
          </Link>

          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200 ease-out ${
              isOpen && isAnimating
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            }`}
            style={{
              transitionDelay: `${(navItems.length + (isSuperadmin ? 1 : 0)) * 30 + 140}ms`,
            }}
          >
            <div className="flex items-center gap-3">
              <FaMoon className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="font-medium text-sm">Dark Mode</span>
            </div>
            <div className={`relative w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${
              theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </button>

          <div className={`pt-2 mt-2 border-t border-gray-200 dark:border-gray-800 transition-all duration-200 ease-out ${
            isOpen && isAnimating
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-4'
          }`}
          style={{
            transitionDelay: `${(navItems.length + (isSuperadmin ? 1 : 0)) * 30 + 170}ms`,
          }}>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-gray-900 dark:text-white truncate">{userName || 'Admin'}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{userEmail}</div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                signOut({ callbackUrl: '/' });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 ease-out"
            >
              <FaSignOutAlt className="w-4 h-4 flex-shrink-0" />
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

