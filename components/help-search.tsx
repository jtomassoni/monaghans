'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSearch } from 'react-icons/fa';
import { HelpDoc } from '@/lib/help-content-loader';
import { expandSearchQuery, findFeaturesByKeyword } from '@/lib/help-keywords';
import Link from 'next/link';

interface HelpSearchProps {
  initialQuery?: string;
  allDocs: HelpDoc[];
}

// Client-safe search function
function searchHelpDocsClient(query: string, allDocs: HelpDoc[]): HelpDoc[] {
  const normalizedQuery = query.toLowerCase().trim();
  const matchingDocs: HelpDoc[] = [];

  for (const doc of allDocs) {
    const searchableText = [
      doc.metadata.title,
      doc.content,
      ...(doc.metadata.keywords || []),
      ...(doc.metadata.aliases || []),
      doc.slug,
    ]
      .join(' ')
      .toLowerCase();

    // Check for exact match or partial match
    if (
      searchableText.includes(normalizedQuery) ||
      normalizedQuery.split(' ').some((word) => searchableText.includes(word))
    ) {
      matchingDocs.push(doc);
    }
  }

  // Sort by relevance (exact matches first, then partial matches)
  matchingDocs.sort((a, b) => {
    const aTitle = a.metadata.title.toLowerCase();
    const bTitle = b.metadata.title.toLowerCase();
    
    const aExact = aTitle === normalizedQuery;
    const bExact = bTitle === normalizedQuery;
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    const aStarts = aTitle.startsWith(normalizedQuery);
    const bStarts = bTitle.startsWith(normalizedQuery);
    
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    return 0;
  });

  return matchingDocs;
}

export default function HelpSearch({ initialQuery, allDocs }: HelpSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<HelpDoc[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      setIsSearching(true);
      // Expand query with synonyms
      const expandedQueries = expandSearchQuery(query);
      
      // Search with all expanded queries
      const allResults: HelpDoc[] = [];
      const seenSlugs = new Set<string>();

      for (const expandedQuery of expandedQueries) {
        const queryResults = searchHelpDocsClient(expandedQuery, allDocs);
        for (const result of queryResults) {
          const key = `${result.metadata.feature}-${result.slug}`;
          if (!seenSlugs.has(key)) {
            allResults.push(result);
            seenSlugs.add(key);
          }
        }
      }

      // Also search by feature keywords
      const matchingFeatures = findFeaturesByKeyword(query);
      for (const feature of matchingFeatures) {
        const featureDocs = allDocs.filter((doc) => doc.metadata.feature === feature);
        for (const doc of featureDocs) {
          const key = `${doc.metadata.feature}-${doc.slug}`;
          if (!seenSlugs.has(key)) {
            allResults.push(doc);
            seenSlugs.add(key);
          }
        }
      }

      // Sort by relevance (exact title matches first)
      allResults.sort((a, b) => {
        const aTitle = a.metadata.title.toLowerCase();
        const bTitle = b.metadata.title.toLowerCase();
        const normalizedQuery = query.toLowerCase();

        const aExact = aTitle === normalizedQuery;
        const bExact = bTitle === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aTitle.startsWith(normalizedQuery);
        const bStarts = bTitle.startsWith(normalizedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      });

      setResults(allResults.slice(0, 10)); // Limit to top 10 results
      setShowResults(true);
      setIsSearching(false);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query, allDocs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/admin/help?q=${encodeURIComponent(query.trim())}`);
      setShowResults(false);
    }
  };

  const handleResultClick = () => {
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setShowResults(true)}
            placeholder="Search help documentation... (e.g., 'calendar', 'create event', 'menu items')"
            className={`w-full pl-12 ${query.trim() ? 'pr-24' : 'pr-4'} py-2.5 text-sm bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-300 dark:focus:border-blue-600 transition-all shadow-sm hover:shadow-md`}
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!isSearching && query.trim() && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Search
            </button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {results.map((doc) => {
              // Color mapping for dropdown results
              const colorMap: Record<string, string> = {
                events: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-l-blue-500',
                menu: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-l-emerald-500',
                specials: 'hover:bg-amber-50 dark:hover:bg-amber-900/20 border-l-amber-500',
                announcements: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 border-l-purple-500',
                homepage: 'hover:bg-rose-50 dark:hover:bg-rose-900/20 border-l-rose-500',
                signage: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-l-indigo-500',
                settings: 'hover:bg-slate-50 dark:hover:bg-slate-900/20 border-l-slate-500',
              };
              const hoverClass = colorMap[doc.metadata.feature] || 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-l-blue-500';
              
              return (
                <Link
                  key={`${doc.metadata.feature}-${doc.slug}`}
                  href={`/admin/help?feature=${doc.metadata.feature}&slug=${doc.slug}`}
                  onClick={handleResultClick}
                  className={`block p-3 border-l-4 ${hoverClass} rounded-lg transition-colors`}
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {doc.metadata.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {doc.metadata.feature}
                  </p>
                </Link>
              );
            })}
            {results.length >= 10 && (
              <button
                onClick={handleSearch}
                className="w-full mt-2 p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                See all results →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}

