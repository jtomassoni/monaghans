import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        accent: {
          DEFAULT: '#dc2626',
          dark: '#991b1b',
        },
        gold: '#d4af37',
        blue: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        green: {
          DEFAULT: '#10b981',
          dark: '#059669',
        },
        purple: {
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
        },
        orange: {
          DEFAULT: '#f97316',
          dark: '#ea580c',
        },
        teal: {
          DEFAULT: '#14b8a6',
          dark: '#0d9488',
        },
        pink: {
          DEFAULT: '#ec4899',
          dark: '#db2777',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          dark: '#0891b2',
        },
      },
    },
  },
  plugins: [],
}

export default config

