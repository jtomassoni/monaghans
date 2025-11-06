'use client';

import { FaGlobe, FaExternalLinkAlt } from 'react-icons/fa';

export default function PreviewSite() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Site Preview</h2>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-4 py-3 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 w-full cursor-pointer border border-blue-400 dark:border-blue-500"
      >
        <div className="flex items-center gap-2">
          <FaGlobe className="w-4 h-4" />
          <span>Preview Site</span>
        </div>
        <FaExternalLinkAlt className="w-3 h-3" />
      </a>
    </div>
  );
}

