'use client';

import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { FaArrowLeft, FaLink, FaExternalLinkAlt, FaBook } from 'react-icons/fa';
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

// Parse markdown content into sections based on h2 headings
function parseSections(content: string): { intro: string; sections: Array<{ title: string; content: string }> } {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = content.split('\n');
  let currentSection: { title: string; content: string } | null = null;
  let introContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is an h2 heading (## heading)
    if (line.startsWith('## ')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = {
        title: line.replace(/^##\s+/, ''),
        content: ''
      };
    } else {
      if (currentSection) {
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      } else {
        // Content before first h2
        introContent += (introContent ? '\n' : '') + line;
      }
    }
  }

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return { intro: introContent, sections };
}

// Helper function to resolve help doc links
function resolveHelpDocLink(href: string, currentDoc: HelpDoc, allDocs: HelpDoc[]): { url: string; type: 'help' | 'dashboard' | 'external' } | null {
  if (!href) return null;
  
  // External links
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return { url: href, type: 'external' };
  }
  
  // Dashboard links (starting with /admin/)
  if (href.startsWith('/admin/')) {
    return { url: href, type: 'dashboard' };
  }
  
  // Help doc links (relative paths ending in .md)
  if (href.endsWith('.md')) {
    // Remove leading ./ or ../
    const cleanPath = href.replace(/^\.\//, '').replace(/^\.\.\//, '');
    
    // Extract feature and slug from path
    // Format: feature/slug.md or ../feature/slug.md
    const parts = cleanPath.split('/');
    if (parts.length >= 2) {
      const feature = parts[parts.length - 2] as FeatureKey;
      const slug = parts[parts.length - 1].replace(/\.md$/, '');
      
      // Verify the doc exists
      const targetDoc = allDocs.find(d => d.metadata.feature === feature && d.slug === slug);
      if (targetDoc) {
        return { url: `/admin/help?feature=${feature}&slug=${slug}`, type: 'help' };
      }
    } else if (parts.length === 1) {
      // Same feature, just slug
      const slug = parts[0].replace(/\.md$/, '');
      const targetDoc = allDocs.find(d => d.metadata.feature === currentDoc.metadata.feature && d.slug === slug);
      if (targetDoc) {
        return { url: `/admin/help?feature=${currentDoc.metadata.feature}&slug=${slug}`, type: 'help' };
      }
    }
  }
  
  // Fallback: treat as external or return null
  return href.startsWith('/') ? { url: href, type: 'external' } : null;
}

export default function HelpContent({ doc, allDocs }: HelpContentProps) {
  // Find related docs
  const relatedDocs = doc.metadata.relatedFeatures
    ? allDocs.filter((d) => doc.metadata.relatedFeatures?.includes(d.metadata.feature))
    : [];

  // Find other docs in the same feature
  const sameFeatureDocs = allDocs.filter(
    (d) => d.metadata.feature === doc.metadata.feature && d.slug !== doc.slug
  );

  // Parse content into sections
  const { intro, sections } = parseSections(doc.content);

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <HelpNavigation currentDoc={doc} allDocs={allDocs} />

      {/* Main Content */}
      <div className="space-y-4">
        {/* Header - Compact */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 text-xs font-semibold ${featureColors[doc.metadata.feature].badge} ${featureColors[doc.metadata.feature].badgeText} rounded-full`}>
            {featureLabels[doc.metadata.feature]}
          </span>
          {doc.metadata.version && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              v{doc.metadata.version}
            </span>
          )}
          {doc.metadata.lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Updated {new Date(doc.metadata.lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Intro Content */}
        {intro.trim() && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {children}
                  </h1>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed text-sm">
                    {children}
                  </p>
                ),
                a: ({ href, children }) => {
                  const resolved = resolveHelpDocLink(href || '', doc, allDocs);
                  
                  if (!resolved) {
                    return (
                      <a
                        href={href}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        target={href?.startsWith('http') ? '_blank' : undefined}
                        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {children}
                      </a>
                    );
                  }
                  
                  if (resolved.type === 'dashboard') {
                    return (
                      <Link
                        href={resolved.url}
                        className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium"
                      >
                        <FaExternalLinkAlt className="w-3 h-3 flex-shrink-0" />
                        <span>{children}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Dashboard)</span>
                      </Link>
                    );
                  }
                  
                  if (resolved.type === 'help') {
                    return (
                      <Link
                        href={resolved.url}
                        className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium"
                      >
                        <FaBook className="w-3 h-3 flex-shrink-0" />
                        <span>{children}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Help Doc)</span>
                      </Link>
                    );
                  }
                  
                  return (
                    <a
                      href={resolved.url}
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>{children}</span>
                      <FaExternalLinkAlt className="w-3 h-3 flex-shrink-0" />
                    </a>
                  );
                },
              }}
            >
              {intro}
            </ReactMarkdown>
          </div>
        )}

        {/* Section Cards Grid */}
        {sections.length > 0 && (
          <div className="space-y-4">
            {/* Tips Section - Compact */}
            {sections
              .filter((section) => section.title.toLowerCase().includes('tip'))
              .map((section, index) => (
                <div
                  key={`tips-${index}`}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-l-4 border-amber-400 dark:border-amber-600 rounded-lg shadow-sm p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">💡</span>
                    <div className="flex-1 min-w-0">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="text-amber-900 dark:text-amber-200 mb-1.5 leading-relaxed text-sm">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside text-amber-900 dark:text-amber-200 mb-1.5 space-y-0.5 text-sm">
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => (
                              <li className="text-amber-900 dark:text-amber-200 text-sm">{children}</li>
                            ),
                          }}
                        >
                          {section.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Regular sections grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections
                .filter((section) => 
                  !section.title.toLowerCase().includes('next step') && 
                  !section.title.toLowerCase().includes('tip')
                )
                .map((section, index) => (
                  <div
                    key={index}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${featureColors[doc.metadata.feature].border} p-4 hover:shadow-lg transition-shadow relative`}
                  >
                    <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br ${featureColors[doc.metadata.feature].gradient} flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800`}>
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <h2 className={`text-base font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b ${featureColors[doc.metadata.feature].border}`}>
                      {section.title}
                    </h2>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          h3: ({ children }) => (
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-2">
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
                          a: ({ href, children }) => {
                            const resolved = resolveHelpDocLink(href || '', doc, allDocs);
                            
                            if (!resolved) {
                              // Fallback for unrecognized links
                              return (
                                <a
                                  href={href}
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                  target={href?.startsWith('http') ? '_blank' : undefined}
                                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                                >
                                  {children}
                                </a>
                              );
                            }
                            
                            if (resolved.type === 'dashboard') {
                              // Dashboard link
                              return (
                                <Link
                                  href={resolved.url}
                                  className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium"
                                >
                                  <FaExternalLinkAlt className="w-3 h-3 flex-shrink-0" />
                                  <span>{children}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Dashboard)</span>
                                </Link>
                              );
                            }
                            
                            if (resolved.type === 'help') {
                              // Help doc link
                              return (
                                <Link
                                  href={resolved.url}
                                  className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium"
                                >
                                  <FaBook className="w-3 h-3 flex-shrink-0" />
                                  <span>{children}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Help Doc)</span>
                                </Link>
                              );
                            }
                            
                            // External link
                            return (
                              <a
                                href={resolved.url}
                                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span>{children}</span>
                                <FaExternalLinkAlt className="w-3 h-3 flex-shrink-0" />
                              </a>
                            );
                          },
                        }}
                      >
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

