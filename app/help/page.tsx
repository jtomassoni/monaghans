import { Suspense } from 'react';
import Link from 'next/link';
import HelpSearch from '@/components/help-search';
import HelpContent from '@/components/help-content';
import HelpGutterNav from '@/components/help-gutter-nav';
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AdminPageHeader
        title={pageTitle}
        description={pageDescription}
      />

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Gutter Navigation */}
        <Suspense fallback={
          <div className="hidden lg:block w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full">
            <div className="p-4 space-y-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>
        }>
          <HelpGutterNav docsByFeature={docsByFeature} featureColors={featureColors} />
        </Suspense>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-2 sm:p-3">
            {/* Search Bar */}
            <div className="mb-2">
              <Suspense fallback={<div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />}>
                <HelpSearch initialQuery={q} allDocs={allDocs} />
              </Suspense>
            </div>

          {/* Content Area */}
          {selectedDoc ? (
            <HelpContent doc={selectedDoc} allDocs={allDocs} />
          ) : q ? (
            <Suspense fallback={<div className="text-center py-8 text-gray-500 dark:text-gray-400">Searching...</div>}>
              <HelpSearchResults query={q} />
            </Suspense>
          ) : (
            <div className="space-y-2">
              {/* Welcome Section */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-lg shadow-lg border-2 border-blue-200 dark:border-gray-700 p-2 md:p-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex-shrink-0">
                    <FaQuestionCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                      Help Documentation
                    </h1>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                      Find answers and learn how to use all features in the admin system.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FaSearch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <h3 className="font-semibold text-xs text-gray-900 dark:text-white">Search</h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                      Use the search bar above to find articles by keywords, feature names, or topics.
                    </p>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FaBook className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <h3 className="font-semibold text-xs text-gray-900 dark:text-white">Browse</h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                      Browse articles by category below or use the sidebar navigation to explore topics.
                    </p>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FaQuestionCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <h3 className="font-semibold text-xs text-gray-900 dark:text-white">Quick Help</h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                      Click "Help" buttons throughout the admin to get contextual help for specific features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Popular Articles */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-amber-200 dark:border-amber-800 p-2 md:p-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <div className="p-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md">
                    <FaBook className="w-3 h-3 text-white" />
                  </div>
                  Popular Articles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {getPopularArticles(allDocs, featureColors, featureLabels).slice(0, 4).map((doc) => (
                    <Link
                      key={`${doc.metadata.feature}-${doc.slug}`}
                      href={`/help?feature=${doc.metadata.feature}&slug=${doc.slug}`}
                      className={`block p-2 rounded-lg border-l-4 ${featureColors[doc.metadata.feature].border} ${featureColors[doc.metadata.feature].bg} ${featureColors[doc.metadata.feature].bgHover} ${featureColors[doc.metadata.feature].borderHover} transition-all duration-200 hover:shadow-md group`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`px-1.5 py-0.5 text-xs font-semibold ${featureColors[doc.metadata.feature].badge} ${featureColors[doc.metadata.feature].badgeText} rounded-full`}>
                              {featureLabels[doc.metadata.feature]}
                            </span>
                          </div>
                          <h3 className={`font-bold text-xs mb-0.5 ${featureColors[doc.metadata.feature].textHover} transition-colors text-gray-900 dark:text-white truncate`}>
                            {doc.metadata.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Browse by Category */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 p-2 md:p-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <div className="p-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md">
                    <FaBook className="w-3 h-3 text-white" />
                  </div>
                  Browse by Category
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                  {(Object.keys(docsByFeature) as FeatureKey[]).map((featureKey) => {
                    const featureDocs = docsByFeature[featureKey];
                    if (featureDocs.length === 0) return null;
                    const colors = featureColors[featureKey];
                    const isSelected = feature === featureKey;

                    return (
                      <Link
                        key={featureKey}
                        href={`/help?feature=${featureKey}`}
                        className={`block p-2 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${
                          isSelected
                            ? `${colors.bg} ${colors.border} shadow-md`
                            : `bg-white dark:bg-gray-800 ${colors.border} ${colors.bgHover} ${colors.borderHover}`
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                            <span className="text-white font-bold text-xs">
                              {featureLabels[featureKey].charAt(0)}
                            </span>
                          </div>
                          {isSelected && (
                            <span className={`px-1 py-0.5 text-xs font-semibold ${colors.badge} ${colors.badgeText} rounded-full`}>
                              Active
                            </span>
                          )}
                        </div>
                        <h3 className={`font-bold text-xs mb-0.5 ${isSelected ? colors.text : 'text-gray-900 dark:text-white'}`}>
                          {featureLabels[featureKey]}
                        </h3>
                        <p className={`text-xs font-medium ${isSelected ? colors.text : 'text-gray-500 dark:text-gray-400'}`}>
                          {featureDocs.length} article{featureDocs.length !== 1 ? 's' : ''}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Featured Articles - Hidden on home page to keep above fold */}
              {docsToShow.length > 0 && feature && (
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 ${
                  feature ? `${featureColors[feature].border}` : 'border-gray-200 dark:border-gray-700'
                } p-3 md:p-4`}>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${
                      feature ? featureColors[feature].gradient : 'from-gray-500 to-gray-600'
                    }`}>
                      <FaQuestionCircle className="w-4 h-4 text-white" />
                    </div>
                    {feature ? `${featureLabels[feature]} Articles` : 'All Articles'}
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                      {docsToShow.length}
                    </span>
                  </h2>
                  <div className="space-y-2">
                    {docsToShow.map((doc) => {
                      const colors = featureColors[doc.metadata.feature];
                      return (
                        <Link
                          key={`${doc.metadata.feature}-${doc.slug}`}
                          href={`/help?feature=${doc.metadata.feature}&slug=${doc.slug}`}
                          className={`block p-3 rounded-lg border-l-4 ${colors.border} ${colors.bg} ${colors.bgHover} ${colors.borderHover} transition-all duration-200 hover:shadow-md group`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-semibold ${colors.badge} ${colors.badgeText} rounded-full`}>
                                  {featureLabels[doc.metadata.feature]}
                                </span>
                              </div>
                              <h3 className={`font-bold text-sm mb-0.5 ${colors.textHover} transition-colors text-gray-900 dark:text-white`}>
                                {doc.metadata.title}
                              </h3>
                              {doc.metadata.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                                  {doc.metadata.description}
                                </p>
                              )}
                            </div>
                            <div className={`w-1.5 h-1.5 rounded-full ${colors.badge} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get popular articles - returns commonly accessed help articles
 */
function getPopularArticles(
  allDocs: ReturnType<typeof loadAllHelpDocs>,
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
  }>,
  featureLabels: Record<FeatureKey, string>
) {
  // Define popular articles by feature and slug
  const popularArticles = [
    { feature: 'events' as FeatureKey, slug: 'getting-started' },
    { feature: 'events' as FeatureKey, slug: 'creating-events' },
    { feature: 'events' as FeatureKey, slug: 'calendar-views' },
    { feature: 'menu' as FeatureKey, slug: 'menu-items' },
    { feature: 'specials' as FeatureKey, slug: 'food-specials' },
    { feature: 'announcements' as FeatureKey, slug: 'creating-announcements' },
  ];

  return popularArticles
    .map(({ feature, slug }) => {
      return allDocs.find((doc) => doc.metadata.feature === feature && doc.slug === slug);
    })
    .filter((doc): doc is NonNullable<typeof doc> => doc !== undefined)
    .slice(0, 6); // Limit to 6 articles
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
                href={`/help?feature=${doc.metadata.feature}&slug=${doc.slug}`}
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

