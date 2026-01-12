'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FeatureKey } from '@/lib/help-keywords';
import { HelpDoc } from '@/lib/help-content-loader';
import { 
  FaCalendarAlt, 
  FaUtensils, 
  FaStar, 
  FaBullhorn, 
  FaHome, 
  FaTv, 
  FaCog,
  FaBook,
} from 'react-icons/fa';

interface HelpTopNavProps {
  docsByFeature: Record<FeatureKey, HelpDoc[]>;
  featureColors: Record<FeatureKey, {
    bg: string;
    bgHover: string;
    border: string;
    borderHover: string;
    text: string;
    textHover: string;
    badge: string;
    badgeText: string;
    gradient: string;
  }>;
}

const featureLabels: Record<FeatureKey, string> = {
  events: 'Calendar & Events',
  menu: 'Menu Management',
  specials: 'Specials',
  announcements: 'Announcements',
  homepage: 'Homepage',
  signage: 'Digital Signage',
  settings: 'Settings',
};

const featureIcons: Record<FeatureKey, typeof FaCalendarAlt> = {
  events: FaCalendarAlt,
  menu: FaUtensils,
  specials: FaStar,
  announcements: FaBullhorn,
  homepage: FaHome,
  signage: FaTv,
  settings: FaCog,
};

export default function HelpTopNav({ docsByFeature, featureColors }: HelpTopNavProps) {
  const searchParams = useSearchParams();
  const currentFeature = searchParams.get('feature') as FeatureKey | null;

  return (
    <div>
      {/* Desktop Top Navigation */}
      <nav className="hidden lg:block border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 flex-wrap">
            {/* All Help Link */}
            <Link
              href="/admin/help"
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                !currentFeature
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500 dark:border-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="p-0.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md">
                <FaBook className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-xs">All Help</span>
            </Link>

            {/* Feature Links */}
            {(Object.keys(docsByFeature) as FeatureKey[]).map((featureKey) => {
              const featureDocs = docsByFeature[featureKey];
              if (featureDocs.length === 0) return null;
              
              const colors = featureColors[featureKey];
              const Icon = featureIcons[featureKey];
              const isActive = currentFeature === featureKey;

              return (
                <Link
                  key={featureKey}
                  href={`/admin/help?feature=${featureKey}`}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? `${colors.bg} ${colors.text} border-b-2 ${colors.border} font-semibold`
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`p-0.5 rounded-md bg-gradient-to-br ${colors.gradient}`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className={`font-medium text-xs ${isActive ? 'font-semibold' : ''}`}>
                    {featureLabels[featureKey]}
                  </span>
                  <span className={`text-[10px] ${isActive ? colors.badgeText : 'text-gray-500 dark:text-gray-400'}`}>
                    ({featureDocs.length})
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Top Navigation */}
      <nav className="lg:hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-40">
        <div className="px-4 py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href="/admin/help"
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all flex-shrink-0 ${
                !currentFeature
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500 dark:border-blue-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="p-0.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md">
                <FaBook className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-xs">All Help</span>
            </Link>

            {(Object.keys(docsByFeature) as FeatureKey[]).map((featureKey) => {
              const featureDocs = docsByFeature[featureKey];
              if (featureDocs.length === 0) return null;
              
              const colors = featureColors[featureKey];
              const Icon = featureIcons[featureKey];
              const isActive = currentFeature === featureKey;

              return (
                <Link
                  key={featureKey}
                  href={`/admin/help?feature=${featureKey}`}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all flex-shrink-0 ${
                    isActive
                      ? `${colors.bg} ${colors.text} border-b-2 ${colors.border} font-semibold`
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className={`p-0.5 rounded-md bg-gradient-to-br ${colors.gradient}`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {featureLabels[featureKey]}
                  </span>
                  <span className={`text-[10px] ${isActive ? colors.badgeText : 'text-gray-500 dark:text-gray-400'}`}>
                    ({featureDocs.length})
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
