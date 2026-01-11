'use client';

import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { FaArrowLeft, FaLink } from 'react-icons/fa';
import { HelpDoc } from '@/lib/help-content-loader';
import { FeatureKey } from '@/lib/help-keywords';
import HelpNavigation from './help-navigation';

interface HelpContentProps {
  doc: HelpDoc;
  allDocs: HelpDoc[];
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
    text: 'text-slate-700 dark:text-slate-300',
    textHover: 'group-hover:text-slate-700 dark:group-hover:text-slate-300',
    badge: 'bg-slate-100 dark:bg-slate-900/40',
    badgeText: 'text-slate-800 dark:text-slate-200',
    gradient: 'from-slate-500 to-slate-600',
  },
};

export default function HelpContent({ doc, allDocs }: HelpContentProps) {
  // Find related docs
  const relatedDocs = doc.metadata.relatedFeatures
    ? allDocs.filter((d) => doc.metadata.relatedFeatures?.includes(d.metadata.feature))
    : [];

  // Find other docs in the same feature
  const sameFeatureDocs = allDocs.filter(
    (d) => d.metadata.feature === doc.metadata.feature && d.slug !== doc.slug
  );

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <HelpNavigation currentDoc={doc} allDocs={allDocs} />

      {/* Article Content */}
      <article className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 ${featureColors[doc.metadata.feature].border} p-3 md:p-4`}>
        {/* Header */}
        <header className={`mb-3 pb-3 border-b-2 ${featureColors[doc.metadata.feature].border}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2.5 py-1 text-xs font-semibold ${featureColors[doc.metadata.feature].badge} ${featureColors[doc.metadata.feature].badgeText} rounded-full`}>
                  {featureLabels[doc.metadata.feature]}
                </span>
                {doc.metadata.version && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    v{doc.metadata.version}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {doc.metadata.title}
              </h1>
              {doc.metadata.lastUpdated && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {new Date(doc.metadata.lastUpdated).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-3 mb-1.5">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-700 dark:text-gray-300 mb-2 leading-relaxed text-sm">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-2 space-y-1 text-sm">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-2 space-y-1 text-sm">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-700 dark:text-gray-300 text-sm">{children}</li>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="block p-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-mono overflow-x-auto mb-2">
                    {children}
                  </code>
                );
              },
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
                  {children}
                </blockquote>
              ),
            }}
          >
            {doc.content}
          </ReactMarkdown>
        </div>
      </article>

      {/* Related Articles */}
      {(relatedDocs.length > 0 || sameFeatureDocs.length > 0) && (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 ${featureColors[doc.metadata.feature].border} p-6 md:p-8`}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${featureColors[doc.metadata.feature].gradient}`}>
              <FaLink className="w-5 h-5 text-white" />
            </div>
            Related Articles
          </h2>
          <div className="space-y-3">
            {relatedDocs.map((relatedDoc) => {
              const colors = featureColors[relatedDoc.metadata.feature];
              return (
                <Link
                  key={`${relatedDoc.metadata.feature}-${relatedDoc.slug}`}
                  href={`/help?feature=${relatedDoc.metadata.feature}&slug=${relatedDoc.slug}`}
                  className={`block p-5 rounded-xl border-l-4 ${colors.border} ${colors.bg} ${colors.bgHover} hover:shadow-md transition-all duration-200 group`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold ${colors.badge} ${colors.badgeText} rounded-full`}>
                      {featureLabels[relatedDoc.metadata.feature]}
                    </span>
                  </div>
                  <h3 className={`font-bold text-lg mb-1 ${colors.textHover} transition-colors text-gray-900 dark:text-white`}>
                    {relatedDoc.metadata.title}
                  </h3>
                </Link>
              );
            })}
            {sameFeatureDocs.slice(0, 3).map((sameDoc) => {
              const colors = featureColors[sameDoc.metadata.feature];
              return (
                <Link
                  key={`${sameDoc.metadata.feature}-${sameDoc.slug}`}
                  href={`/help?feature=${sameDoc.metadata.feature}&slug=${sameDoc.slug}`}
                  className={`block p-5 rounded-xl border-l-4 ${colors.border} ${colors.bg} ${colors.bgHover} hover:shadow-md transition-all duration-200 group`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold ${colors.badge} ${colors.badgeText} rounded-full`}>
                      {featureLabels[sameDoc.metadata.feature]}
                    </span>
                  </div>
                  <h3 className={`font-bold text-lg mb-1 ${colors.textHover} transition-colors text-gray-900 dark:text-white`}>
                    {sameDoc.metadata.title}
                  </h3>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

