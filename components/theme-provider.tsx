'use client';

import { createContext, useContext, useState, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Check if we're on a public route (not admin or timeclock)
  // Default to public route if pathname is not available yet
  const isPublicRoute = !pathname || (!pathname.startsWith('/admin') && pathname !== '/timeclock');

  // Use useLayoutEffect to apply theme synchronously before paint
  useLayoutEffect(() => {
    // For public routes, always force dark mode
    if (isPublicRoute) {
      document.documentElement.classList.add('dark');
      setTheme('dark');
      setMounted(true);
      return;
    }

    // For admin routes, use saved theme preference
    const savedTheme = localStorage.getItem('admin-theme') as Theme | null;
    const initialTheme = savedTheme || 'light';
    
    // Apply to document immediately
    const root = document.documentElement;
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Set state
    setTheme(initialTheme);
    setMounted(true);
  }, [isPublicRoute, pathname]);

  const toggleTheme = () => {
    // Only allow theme toggle in admin routes
    if (isPublicRoute) {
      return;
    }

    // Determine new theme from current state
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    
    // Apply to document IMMEDIATELY and synchronously - BEFORE React state update
    const html = document.documentElement;
    
    // Toggle the class directly
    if (newTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('admin-theme', newTheme);
    
    // Update state AFTER DOM manipulation
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

