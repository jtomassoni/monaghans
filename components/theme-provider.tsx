'use client';

import { createContext, useContext, useState, useLayoutEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Use useLayoutEffect to apply theme synchronously before paint
  useLayoutEffect(() => {
    // Get theme from localStorage on mount
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
  }, []);

  const toggleTheme = () => {
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

