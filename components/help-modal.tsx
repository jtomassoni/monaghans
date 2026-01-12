'use client';

import { useState, useEffect } from 'react';
import Modal from './modal';
import { FaQuestionCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { FeatureKey } from '@/lib/help-keywords';
import { HelpDoc } from '@/lib/help-content-loader';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface HelpModalProps {
  feature: FeatureKey;
  slug?: string;
  title?: string;
  content?: string;
  doc?: HelpDoc; // Pre-loaded doc (preferred)
  trigger?: React.ReactNode;
  onClose?: () => void;
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

export default function HelpModal({
  feature,
  slug,
  title,
  content,
  doc: providedDoc,
  trigger,
  onClose,
}: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [helpDoc, setHelpDoc] = useState<HelpDoc | null>(providedDoc || null);
  const [isLoading, setIsLoading] = useState(false);

  // Load help doc from API if slug provided but doc not provided
  useEffect(() => {
    if (isOpen && !providedDoc && slug) {
      setIsLoading(true);
      fetch(`/api/help/docs?feature=${feature}&slug=${slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.doc) {
            setHelpDoc(data.doc);
          }
        })
        .catch((error) => {
          console.error('Error loading help doc:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (isOpen && !providedDoc && !slug) {
      // Get first doc for feature if no slug
      setIsLoading(true);
      fetch(`/api/help/docs?feature=${feature}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.docs && data.docs.length > 0) {
            setHelpDoc(data.docs[0]);
          }
        })
        .catch((error) => {
          console.error('Error loading help docs:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, providedDoc, slug, feature]);

  const displayTitle = title || helpDoc?.metadata.title || featureLabels[feature];
  const displayContent = content || helpDoc?.content || (isLoading ? 'Loading...' : 'Help content not available.');

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const helpUrl = slug
    ? `/admin/help?feature=${feature}&slug=${slug}`
    : `/admin/help?feature=${feature}`;

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          title="Help"
        >
          <FaQuestionCircle className="w-4 h-4" />
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={displayTitle}
        zIndex={10060}
      >
        <div className="space-y-4">
          {/* Help Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {(() => {
              // Try to extract a summary or first section
              const contentLines = displayContent.split('\n').filter(Boolean);
              let summary = '';
              let keyPoints: string[] = [];
              
              // Look for first paragraph or list
              for (let i = 0; i < Math.min(contentLines.length, 10); i++) {
                const line = contentLines[i].trim();
                if (line.startsWith('#') && summary) break; // Stop at next heading
                if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
                  keyPoints.push(line.replace(/^[-*\d+.]\s*/, ''));
                } else if (line.length > 20 && !summary) {
                  summary = line.substring(0, 300);
                }
              }
              
              // If we have key points, show those; otherwise show summary
              if (keyPoints.length > 0) {
                return (
                  <div className="space-y-3">
                    {summary && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {summary}
                      </p>
                    )}
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 text-sm">
                      {keyPoints.slice(0, 5).map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                );
              }
              
              // Fallback: show first 500 chars
              const truncated = displayContent.length > 500 
                ? displayContent.substring(0, 500) + '...'
                : displayContent;
              
              return (
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-2 mb-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white mt-2 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-2 mb-1">
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
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {truncated}
                </ReactMarkdown>
              );
            })()}
          </div>
          
          {/* Combined Info and Tip Section */}
          {displayContent.length > 500 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>Tip:</strong> This is a quick overview. For complete details and step-by-step instructions, click "Learn More" below to open the full documentation in a new tab.
              </p>
            </div>
          )}

          {/* Learn More Link - Opens full help doc in new tab */}
          <div className="pt-6 pb-2 border-t border-gray-200 dark:border-gray-700">
            <Link
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
              onClick={handleClose}
            >
              <FaExternalLinkAlt className="w-4 h-4" />
              Learn More
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}

