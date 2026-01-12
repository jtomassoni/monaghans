import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SignageForm from './signage-form';
import HelpModal from '@/components/help-modal';
import { FaQuestionCircle } from 'react-icons/fa';

type SignageConfig = {
  includeWelcome: boolean;
  includeFoodSpecials: boolean;
  includeDrinkSpecials: boolean;
  includeHappyHour: boolean;
  includeEvents: boolean;
  eventsTileCount: number;
  // Kept for backward compatibility with older saved configs
  daysAhead?: number;
  slideDurationSec: number;
  fadeDurationSec: number;
  customSlides: any[];
};

const DEFAULT_CONFIG: SignageConfig = {
  includeWelcome: true,
  includeFoodSpecials: true,
  includeDrinkSpecials: true,
  includeHappyHour: true,
  includeEvents: true,
  eventsTileCount: 6, // show up to 6 events by default
  slideDurationSec: 10,
  fadeDurationSec: 0.8,
  customSlides: [],
};

function sanitizeConfig(value: any): SignageConfig {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const tiles = (() => {
      if (typeof parsed?.eventsTileCount === 'number') return parsed.eventsTileCount;
      if (typeof parsed?.daysAhead === 'number') return parsed.daysAhead; // backward compatibility
      return DEFAULT_CONFIG.eventsTileCount;
    })();
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      eventsTileCount: Math.min(Math.max(Number(tiles) || DEFAULT_CONFIG.eventsTileCount, 1), 12),
      daysAhead: parsed?.daysAhead,
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

      <div className="flex-shrink-0 px-6 py-5 pt-20 md:pt-5 border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl shadow-lg ring-2 ring-blue-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Digital Signage Manager</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Configure TV display settings, content slides, and ad campaigns
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpModal
                feature="signage"
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    <FaQuestionCircle className="w-4 h-4" />
                    Help
                  </button>
                }
              />
              <a
                href="/specials-tv"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:from-gray-200 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all shadow-sm hover:shadow-md border border-gray-200/50 dark:border-gray-700/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Preview TV Display
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 relative z-10">
        <div className="max-w-7xl mx-auto h-full">
          <SignageForm initialConfig={initialConfig} />
        </div>
      </div>
    </div>
  );
}

