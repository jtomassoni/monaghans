import { Suspense } from 'react';
import Link from 'next/link';
import HelpSearch from '@/components/help-search';
import HelpContent from '@/components/help-content';
import HelpTopNav from '@/components/help-top-nav';
import { loadAllHelpDocs, findHelpDocBySlug, findHelpDocsByFeature } from '@/lib/help-content-loader';
import { FeatureKey } from '@/lib/help-keywords';
import AdminPageHeader from '@/components/admin-page-header';
import { FaBook, FaQuestionCircle, FaSearch } from 'react-icons/fa';

interface HelpPageProps {
  searchParams: Promise<{
    section?: string;
    feature?: FeatureKey;
    slug?: string;
    q?: string;
  }>;
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const params = await searchParams;
  const { section, feature, slug, q } = params;

  // Load all help docs
  const allDocs = loadAllHelpDocs();

  // Determine which docs to show
  let docsToShow = allDocs;
  let selectedDoc = null;
  let pageTitle = 'Help Documentation';
  let pageDescription = 'Find help for any feature in the admin system';

  if (slug && feature) {
    // Show specific doc
    selectedDoc = findHelpDocBySlug(slug, feature);
    if (selectedDoc) {
      pageTitle = selectedDoc.metadata.title;
      pageDescription = `Help for ${selectedDoc.metadata.feature}`;
    }
  } else if (feature) {
    // Show all docs for a feature
    docsToShow = findHelpDocsByFeature(feature);
    pageTitle = `${feature.charAt(0).toUpperCase() + feature.slice(1)} Help`;
    pageDescription = `Help documentation for ${feature}`;
  } else if (section) {
    // Legacy support for section parameter (maps to feature)
    const sectionToFeature: Record<string, FeatureKey> = {
      'calendar-events': 'events',
      'menu-management': 'menu',
      'specials': 'specials',
      'announcements': 'announcements',
      'homepage': 'homepage',
      'signage': 'signage',
      'settings': 'settings',
    };
    const mappedFeature = sectionToFeature[section];
    if (mappedFeature) {
      docsToShow = findHelpDocsByFeature(mappedFeature);
      pageTitle = `${mappedFeature.charAt(0).toUpperCase() + mappedFeature.slice(1)} Help`;
      pageDescription = `Help documentation for ${mappedFeature}`;
    }
  }

  // Group docs by feature
  const docsByFeature: Record<FeatureKey, typeof allDocs> = {
    events: [],
    menu: [],
    specials: [],
    announcements: [],
    homepage: [],
    signage: [],
    settings: [],
  };

  for (const doc of allDocs) {
    if (docsByFeature[doc.metadata.feature]) {
      docsByFeature[doc.metadata.feature].push(doc);
    }
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

  // Color scheme for each feature
  const featureColors: Record<FeatureKey, {
    bg: string;
    bgHover: string;
    border: string;
    borderHover: string;
    text: string;
    textHover: string;
    badge: string;
    badgeText: string;
    gradient: string;
  }> = {
    events: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      bgHover: 'hover:bg-blue-100 dark:hover:bg-blue-950/50',
      border: 'border-blue-300 dark:border-blue-700',
      borderHover: 'hover:border-blue-500 dark:hover:border-blue-400',
      text: 'text-blue-700 dark:text-blue-300',
      textHover: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-900/40',
      badgeText: 'text-blue-800 dark:text-blue-200',
      gradient: 'from-blue-500 to-blue-600',
    },
    menu: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      bgHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-950/50',
      border: 'border-emerald-300 dark:border-emerald-700',
      borderHover: 'hover:border-emerald-500 dark:hover:border-emerald-400',
      text: 'text-emerald-700 dark:text-emerald-300',
      textHover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300',
      badge: 'bg-emerald-100 dark:bg-emerald-900/40',
      badgeText: 'text-emerald-800 dark:text-emerald-200',
      gradient: 'from-emerald-500 to-emerald-600',
    },
    specials: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      bgHover: 'hover:bg-amber-100 dark:hover:bg-amber-950/50',
      border: 'border-amber-300 dark:border-amber-700',
      borderHover: 'hover:border-amber-500 dark:hover:border-amber-400',
      text: 'text-amber-700 dark:text-amber-300',
      textHover: 'group-hover:text-amber-700 dark:group-hover:text-amber-300',
      badge: 'bg-amber-100 dark:bg-amber-900/40',
      badgeText: 'text-amber-800 dark:text-amber-200',
      gradient: 'from-amber-500 to-amber-600',
    },
    announcements: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      bgHover: 'hover:bg-purple-100 dark:hover:bg-purple-950/50',
      border: 'border-purple-300 dark:border-purple-700',
      borderHover: 'hover:border-purple-500 dark:hover:border-purple-400',
      text: 'text-purple-700 dark:text-purple-300',
      textHover: 'group-hover:text-purple-700 dark:group-hover:text-purple-300',
      badge: 'bg-purple-100 dark:bg-purple-900/40',
      badgeText: 'text-purple-800 dark:text-purple-200',
      gradient: 'from-purple-500 to-purple-600',
    },
    homepage: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      bgHover: 'hover:bg-rose-100 dark:hover:bg-rose-950/50',
      border: 'border-rose-300 dark:border-rose-700',
      borderHover: 'hover:border-rose-500 dark:hover:border-rose-400',
      text: 'text-rose-700 dark:text-rose-300',
      textHover: 'group-hover:text-rose-700 dark:group-hover:text-rose-300',
      badge: 'bg-rose-100 dark:bg-rose-900/40',
      badgeText: 'text-rose-800 dark:text-rose-200',
      gradient: 'from-rose-500 to-rose-600',
    },
    signage: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      bgHover: 'hover:bg-indigo-100 dark:hover:bg-indigo-950/50',
      border: 'border-indigo-300 dark:border-indigo-700',
      borderHover: 'hover:border-indigo-500 dark:hover:border-indigo-400',
      text: 'text-indigo-700 dark:text-indigo-300',
      textHover: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
      badge: 'bg-indigo-100 dark:bg-indigo-900/40',
      badgeText: 'text-indigo-800 dark:text-indigo-200',
      gradient: 'from-indigo-500 to-indigo-600',
    },
    settings: {
      bg: 'bg-slate-50 dark:bg-slate-950/30',
      bgHover: 'hover:bg-slate-100 dark:hover:bg-slate-950/50',
      border: 'border-slate-300 dark:border-slate-700',
      borderHover: 'hover:border-slate-500 dark:hover:border-slate-400',
      text: 'text-slate-700 dark:text-slate-300',
      textHover: 'group-hover:text-slate-700 dark:group-hover:text-slate-300',
      badge: 'bg-slate-100 dark:bg-slate-900/40',
      badgeText: 'text-slate-800 dark:text-slate-200',
      gradient: 'from-slate-500 to-slate-600',
    },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <AdminPageHeader
        title={pageTitle}
        description={pageDescription}
      />

      {/* Top Navigation - Always show */}
      <Suspense fallback={
        <div className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>
      }>
        <HelpTopNav docsByFeature={docsByFeature} featureColors={featureColors} />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-3 sm:p-4">
          {/* Content Area */}
          {selectedDoc ? (
            <>
              {/* Search Bar */}
              <div className="mb-3">
                <Suspense fallback={<div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />}>
                  <HelpSearch initialQuery={q} allDocs={allDocs} />
                </Suspense>
              </div>
              <HelpContent doc={selectedDoc} allDocs={allDocs} />
            </>
          ) : q ? (
            <>
              {/* Search Bar */}
              <div className="mb-3">
                <Suspense fallback={<div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />}>
                  <HelpSearch initialQuery={q} allDocs={allDocs} />
                </Suspense>
              </div>
              <Suspense fallback={<div className="text-center py-8 text-gray-500 dark:text-gray-400">Searching...</div>}>
                <HelpSearchResults query={q} />
              </Suspense>
            </>
          ) : feature && !slug ? (
            <>
              {/* Search Bar */}
              <div className="mb-3">
                <Suspense fallback={<div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />}>
                  <HelpSearch initialQuery={q} allDocs={allDocs} />
                </Suspense>
              </div>
              {/* Category Selected - Show only articles for this category */}
              <div>
              {/* Elegant Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${featureColors[feature].gradient} flex items-center justify-center shadow-lg`}>
                        <span className="font-bold text-xl text-white">
                          {featureLabels[feature].charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                          {featureLabels[feature]}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {docsToShow.length} {docsToShow.length === 1 ? 'article' : 'articles'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/admin/help"
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
                  >
                    ← Back
                  </Link>
                </div>
              </div>

              {/* Article List - Elegant */}
              <div className="space-y-2">
                {docsToShow.map((doc, index) => {
                  const colors = featureColors[doc.metadata.feature];
                  return (
                    <Link
                      key={`${doc.metadata.feature}-${doc.slug}`}
                      href={`/admin/help?feature=${doc.metadata.feature}&slug=${doc.slug}`}
                      className="group flex items-start gap-4 p-4 rounded-lg bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all duration-200"
                    >
                      {/* Elegant number indicator */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                        <span className="text-white font-semibold text-sm">{index + 1}</span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                          {doc.metadata.title}
                        </h3>
                      </div>
                      
                      {/* Subtle arrow */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
            </>
          ) : (
            /* Home Page - Show welcome, browse, and popular */
            <div className="space-y-4">
              {/* Welcome Hero Section - Compact */}
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-11 h-11 mb-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-800/50">
                  <FaQuestionCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
                  Help Documentation
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                  Find answers and learn how to use all features
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-3">
                <Suspense fallback={<div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />}>
                  <HelpSearch initialQuery={q} allDocs={allDocs} />
                </Suspense>
              </div>

              {/* Browse by Category */}
              <div>
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Browse by Category
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {(Object.keys(docsByFeature) as FeatureKey[]).map((featureKey) => {
                    const featureDocs = docsByFeature[featureKey];
                    if (featureDocs.length === 0) return null;
                    const colors = featureColors[featureKey];

                    return (
                      <Link
                        key={featureKey}
                        href={`/admin/help?feature=${featureKey}`}
                        className="group relative block p-3 rounded-lg bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} opacity-60 group-hover:opacity-100 shadow-sm flex items-center justify-center transition-all`}>
                            <span className="font-semibold text-base text-white">
                              {featureLabels[featureKey].charAt(0)}
                            </span>
                          </div>
                          <div className="w-full">
                            <h3 className="font-medium text-xs mb-0.5 text-gray-700 dark:text-gray-300">
                              {featureLabels[featureKey]}
                            </h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {featureDocs.length} {featureDocs.length === 1 ? 'article' : 'articles'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function HelpSearchResults({ query }: { query: string }) {
  const { searchHelpDocs } = await import('@/lib/help-content-loader');
  const results = searchHelpDocs(query);

  if (results.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaQuestionCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          No results found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Try searching with different keywords or browse by category above.
        </p>
      </div>
    );
  }

  // Color scheme for search results (same as main page)
  const featureColors: Record<string, {
    bg: string;
    bgHover: string;
    border: string;
    borderHover: string;
    text: string;
    textHover: string;
    badge: string;
    badgeText: string;
  }> = {
    events: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      bgHover: 'hover:bg-blue-100 dark:hover:bg-blue-950/50',
      border: 'border-blue-300 dark:border-blue-700',
      borderHover: 'hover:border-blue-500 dark:hover:border-blue-400',
      text: 'text-blue-700 dark:text-blue-300',
      textHover: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-900/40',
      badgeText: 'text-blue-800 dark:text-blue-200',
    },
    menu: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      bgHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-950/50',
      border: 'border-emerald-300 dark:border-emerald-700',
      borderHover: 'hover:border-emerald-500 dark:hover:border-emerald-400',
      text: 'text-emerald-700 dark:text-emerald-300',
      textHover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300',
      badge: 'bg-emerald-100 dark:bg-emerald-900/40',
      badgeText: 'text-emerald-800 dark:text-emerald-200',
    },
    specials: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      bgHover: 'hover:bg-amber-100 dark:hover:bg-amber-950/50',
      border: 'border-amber-300 dark:border-amber-700',
      borderHover: 'hover:border-amber-500 dark:hover:border-amber-400',
      text: 'text-amber-700 dark:text-amber-300',
      textHover: 'group-hover:text-amber-700 dark:group-hover:text-amber-300',
      badge: 'bg-amber-100 dark:bg-amber-900/40',
      badgeText: 'text-amber-800 dark:text-amber-200',
    },
    announcements: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      bgHover: 'hover:bg-purple-100 dark:hover:bg-purple-950/50',
      border: 'border-purple-300 dark:border-purple-700',
      borderHover: 'hover:border-purple-500 dark:hover:border-purple-400',
      text: 'text-purple-700 dark:text-purple-300',
      textHover: 'group-hover:text-purple-700 dark:group-hover:text-purple-300',
      badge: 'bg-purple-100 dark:bg-purple-900/40',
      badgeText: 'text-purple-800 dark:text-purple-200',
    },
    homepage: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      bgHover: 'hover:bg-rose-100 dark:hover:bg-rose-950/50',
      border: 'border-rose-300 dark:border-rose-700',
      borderHover: 'hover:border-rose-500 dark:hover:border-rose-400',
      text: 'text-rose-700 dark:text-rose-300',
      textHover: 'group-hover:text-rose-700 dark:group-hover:text-rose-300',
      badge: 'bg-rose-100 dark:bg-rose-900/40',
      badgeText: 'text-rose-800 dark:text-rose-200',
    },
    signage: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      bgHover: 'hover:bg-indigo-100 dark:hover:bg-indigo-950/50',
      border: 'border-indigo-300 dark:border-indigo-700',
      borderHover: 'hover:border-indigo-500 dark:hover:border-indigo-400',
      text: 'text-indigo-700 dark:text-indigo-300',
      textHover: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
      badge: 'bg-indigo-100 dark:bg-indigo-900/40',
      badgeText: 'text-indigo-800 dark:text-indigo-200',
    },
    settings: {
      bg: 'bg-slate-50 dark:bg-slate-950/30',
      bgHover: 'hover:bg-slate-100 dark:hover:bg-slate-950/50',
      border: 'border-slate-300 dark:border-slate-700',
      borderHover: 'hover:border-slate-500 dark:hover:border-slate-400',
      text: 'text-slate-700 dark:text-slate-300',
      textHover: 'group-hover:text-slate-700 dark:group-hover:text-slate-300',
      badge: 'bg-slate-100 dark:bg-slate-900/40',
      badgeText: 'text-slate-800 dark:text-slate-200',
    },
  };

  const featureLabels: Record<string, string> = {
    events: 'Calendar & Events',
    menu: 'Menu Management',
    specials: 'Specials',
    announcements: 'Announcements',
    homepage: 'Homepage',
    signage: 'Digital Signage',
    settings: 'Settings',
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <FaSearch className="w-5 h-5 text-white" />
          </div>
          Search Results
          <span className="ml-auto px-3 py-1 text-sm font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </span>
        </h2>
        <div className="space-y-3">
          {results.map((doc) => {
            const colors = featureColors[doc.metadata.feature] || featureColors.events;
            return (
              <Link
                key={`${doc.metadata.feature}-${doc.slug}`}
                href={`/admin/help?feature=${doc.metadata.feature}&slug=${doc.slug}`}
                className={`block p-5 rounded-xl border-l-4 ${colors.border} ${colors.bg} ${colors.bgHover} ${colors.borderHover} transition-all duration-200 hover:shadow-md group`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold ${colors.badge} ${colors.badgeText} rounded-full`}>
                        {featureLabels[doc.metadata.feature] || doc.metadata.feature}
                      </span>
                    </div>
                    <h3 className={`font-bold text-lg mb-2 text-gray-900 dark:text-white ${colors.textHover || colors.text} transition-colors`}>
                      {doc.metadata.title}
                    </h3>
                    {doc.content.substring(0, 150) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {doc.content.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
