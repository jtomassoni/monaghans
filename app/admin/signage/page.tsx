import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SignageForm from './signage-form';

type SignageConfig = {
  includeFoodSpecials: boolean;
  includeDrinkSpecials: boolean;
  includeHappyHour: boolean;
  includeEvents: boolean;
  daysAhead: number;
  slideDurationSec: number;
  fadeDurationSec: number;
  customSlides: any[];
};

const DEFAULT_CONFIG: SignageConfig = {
  includeFoodSpecials: true,
  includeDrinkSpecials: true,
  includeHappyHour: true,
  includeEvents: true,
  daysAhead: 7, // next week by default
  slideDurationSec: 10,
  fadeDurationSec: 0.8,
  customSlides: [],
};

function sanitizeConfig(value: any): SignageConfig {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      daysAhead: Math.min(Math.max(Number(parsed?.daysAhead) || DEFAULT_CONFIG.daysAhead, 1), 7),
      slideDurationSec: Math.min(Math.max(Number(parsed?.slideDurationSec) || DEFAULT_CONFIG.slideDurationSec, 4), 60),
      fadeDurationSec: Math.min(Math.max(Number(parsed?.fadeDurationSec) || DEFAULT_CONFIG.fadeDurationSec, 0.3), 5),
      customSlides: Array.isArray(parsed?.customSlides) ? parsed.customSlides : [],
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default async function AdminSignagePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const setting = await prisma.setting.findUnique({
    where: { key: 'signageConfig' },
  });

  const initialConfig = sanitizeConfig(setting?.value);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-200/20 dark:from-blue-900/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-purple-200/20 dark:from-purple-900/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-200/10 dark:from-indigo-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="flex-shrink-0 px-6 py-4 pt-20 md:pt-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Digital Signage Manager</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Configure TV display settings and custom slides
                </p>
              </div>
            </div>
            <a
              href="/specials-tv"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preview TV Display
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <SignageForm initialConfig={initialConfig} />
        </div>
      </div>
    </div>
  );
}

