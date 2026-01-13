'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { showToast } from '@/components/toast';
import SignageUploadModal from '@/components/signage-upload-modal';
import ConfirmationDialog from '@/components/confirmation-dialog';

type SignageItem = {
  title: string;
  note?: string;
  time?: string;
  detail?: string;
};

type SignageSlide = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  body?: string;
  accent?: 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan';
  footer?: string;
  position?: number;
  isEnabled?: boolean;
  slideType?: 'text' | 'image'; // 'text' for text-based slides, 'image' for image-based slides
  // Image support - if imageUrl is set, this is an image-based slide
  imageUrl?: string;
  imageStorageKey?: string; // Storage key for the uploaded image
  showBorder?: boolean; // For image slides: show border with accent color (default: true for backward compatibility)
};

type SignageConfig = {
  includeWelcome: boolean;
  includeFoodSpecials: boolean;
  includeDrinkSpecials: boolean;
  includeHappyHour: boolean;
  includeEvents: boolean;
  includeCustomSlides: boolean;
  eventsTileCount: number;
  slideDurationSec: number;
  fadeDurationSec: number;
  customSlides: SignageSlide[];
};

type Props = {
  initialConfig: SignageConfig;
};

function uuid() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `slide-${Date.now()}`);
}

interface Asset {
  id: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  upload: {
    id: string;
    originalFilename: string;
    mimeType: string;
  };
}

export default function SignageForm({ initialConfig }: Props) {
  const [config, setConfig] = useState<SignageConfig>(initialConfig);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [adGallery, setAdGallery] = useState<Asset[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadingToGallery, setUploadingToGallery] = useState(false);
  const [uploadingForSlideId, setUploadingForSlideId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'gallery'>('settings');
  const [expandedSlideId, setExpandedSlideId] = useState<string | null>(null);
  const [newSlideId, setNewSlideId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideDurationOptions = useMemo(() => {
    const options: number[] = [5];
    for (let v = 15; v <= 120; v += 15) options.push(v);
    if (!options.includes(config.slideDurationSec)) options.push(config.slideDurationSec);
    return options.sort((a, b) => a - b);
  }, [config.slideDurationSec]);

  const fadeDurationOptions = useMemo(() => {
    const options: number[] = [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0];
    if (!options.includes(config.fadeDurationSec)) options.push(config.fadeDurationSec);
    return options.sort((a, b) => a - b);
  }, [config.fadeDurationSec]);

  const eventTileOptions = useMemo(() => {
    const options: number[] = [];
    for (let v = 2; v <= 6; v += 1) options.push(v);
    if (Number.isFinite(config.eventsTileCount) && config.eventsTileCount > 0 && !options.includes(config.eventsTileCount)) {
      options.push(config.eventsTileCount);
    }
    return options.sort((a, b) => a - b);
  }, [config.eventsTileCount]);

  // Fetch ad gallery assets on mount
  useEffect(() => {
    fetchAdGallery();
  }, []);

  // Auto-save functionality with debouncing
  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set status to saving
    setSaveStatus('saving');

    // Debounce the save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/signage-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to save');
        }
        setSaveStatus('saved');
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        setSaveStatus('error');
        showToast('Failed to auto-save changes', 'error', 'Please check your connection and try again.');
        // Reset to idle after 3 seconds on error
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config]);

  const fetchAdGallery = async () => {
    try {
      const response = await fetch('/api/signage/assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const assets: Asset[] = await response.json();
      setAdGallery(assets);
    } catch (error) {
      console.error('Failed to load ad gallery:', error);
    }
  };

  const handleGalleryUpload = async (result: { uploadId: string; assets: Array<{ id: string; storageKey: string; kind: string }> }) => {
    setUploadingToGallery(false);
    setUploadModalOpen(false);
    showToast('Image uploaded to gallery', 'success');
    await fetchAdGallery(); // Refresh gallery
  };

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/signage/assets/${assetToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.details || 'Failed to delete image');
      }

      showToast('Image deleted successfully', 'success');
      await fetchAdGallery(); // Refresh gallery
      setDeleteConfirmOpen(false);
      setAssetToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to delete image', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const sortedSlides = useMemo(() => {
    return [...(config.customSlides || [])]
      .map((slide, idx) => ({ ...slide, position: typeof slide.position === 'number' ? slide.position : idx + 1 }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [config.customSlides]);

  // Separate new slides from existing slides for display
  const existingSlides = useMemo(() => {
    return sortedSlides.filter(slide => slide.id !== newSlideId);
  }, [sortedSlides, newSlideId]);

  const newSlide = useMemo(() => {
    return newSlideId ? sortedSlides.find(slide => slide.id === newSlideId) : null;
  }, [sortedSlides, newSlideId]);

  const updateSlide = (id: string, updater: (slide: SignageSlide) => SignageSlide) => {
    setConfig((prev) => ({
      ...prev,
      customSlides: (prev.customSlides || []).map((slide) => (slide.id === id ? updater(slide) : slide)),
    }));
  };

  const addSlide = () => {
    // Close any other open forms
    setExpandedSlideId(null);
    
    const newId = uuid();
    setNewSlideId(newId);
    
    // Add new slide at position 1 (top), shift all others down
    setConfig((prev) => {
      const updatedSlides = (prev.customSlides || []).map(slide => ({
        ...slide,
        position: (slide.position || 0) + 1,
      }));
      
      return {
        ...prev,
        customSlides: [
          {
            id: newId,
            label: 'Custom',
            title: 'New Slide',
            subtitle: '',
            body: '',
            accent: 'accent',
            footer: '',
            position: 1,
            isEnabled: false,
            slideType: 'text', // Default to text-based slide
          },
          ...updatedSlides,
        ],
      };
    });
  };

  const handleSlideSaved = (slideId: string) => {
    // When a slide is saved (has meaningful content), collapse it and clear newSlideId if it was new
    if (newSlideId === slideId) {
      setNewSlideId(null);
    }
    setExpandedSlideId(null);
  };

  const toggleSlideExpansion = (slideId: string) => {
    // Close new slide form if opening an existing one
    if (newSlideId && slideId !== newSlideId) {
      setNewSlideId(null);
    }
    
    // Toggle expansion - if already expanded, collapse; otherwise expand (and close any other)
    if (expandedSlideId === slideId) {
      setExpandedSlideId(null);
    } else {
      setExpandedSlideId(slideId);
    }
  };

  const removeSlide = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      customSlides: (prev.customSlides || []).filter((slide) => slide.id !== id),
    }));
  };

  const moveSlide = (id: string, direction: 'up' | 'down') => {
    const slides = sortedSlides;
    const index = slides.findIndex((s) => s.id === id);
    if (index === -1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[target];
    newSlides[target] = temp;
    const rePos = newSlides.map((slide, idx) => ({ ...slide, position: idx + 1 }));
    setConfig((prev) => ({ ...prev, customSlides: rePos }));
  };

  const addItem = (slideId: string) => {
    // No-op: list items removed from custom slides
  };

  const updateItem = (slideId: string, idx: number, field: keyof SignageItem, value: string) => {
    // No-op: list items removed from custom slides
  };

  const removeItem = (slideId: string, idx: number) => {
    // No-op: list items removed from custom slides
  };


  return (
    <div className="space-y-4 pb-8">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 px-1">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-semibold transition-all relative ${
            activeTab === 'settings'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Settings
          </span>
          {activeTab === 'settings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2 text-sm font-semibold transition-all relative ${
            activeTab === 'gallery'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Ad Gallery
          </span>
          {activeTab === 'gallery' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-400 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-3 pt-1">
          {/* Auto-save Info Banner */}
          <div className="rounded-lg border border-blue-200/60 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-semibold">Auto-save enabled:</span> Changes are automatically saved as you make them. The TV display will refresh automatically to show updates.
            </p>
          </div>

      {/* Playlist Settings Card */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-lg shadow-md ring-1 ring-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Playlist Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure timing and content display</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Slide Duration</span>
            </div>
            <select
              value={config.slideDurationSec}
              onChange={(e) => setConfig({ ...config, slideDurationSec: Number(e.target.value) })}
              className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white font-medium shadow-sm hover:border-blue-400 dark:hover:border-blue-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {slideDurationOptions.map((val) => (
                <option key={val} value={val}>
                  {val} seconds
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Slide Transition Duration</span>
            </div>
            <select
              value={config.fadeDurationSec}
              onChange={(e) => setConfig({ ...config, fadeDurationSec: Number(e.target.value) })}
              className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white font-medium shadow-sm hover:border-purple-400 dark:hover:border-purple-600 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            >
              {fadeDurationOptions.map((val) => (
                <option key={val} value={val}>
                  {val} seconds
                </option>
              ))}
            </select>
          </label>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200/80 dark:border-gray-800/80">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Content Display</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              { 
                key: 'includeWelcome', 
                label: 'Welcome Screen', 
                icon: '👋', 
                activeClass: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md ring-2 ring-yellow-500/20', 
                checkClass: 'border-yellow-500 bg-yellow-500', 
                textClass: 'text-yellow-900 dark:text-yellow-100',
                preview: {
                  title: "Monaghan's",
                  subtitle: "Established 1892",
                  body: "Denver's Second-Oldest Bar",
                  accent: 'gold'
                }
              },
              { 
                key: 'includeFoodSpecials', 
                label: 'Food Specials', 
                icon: '🍽️', 
                activeClass: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md ring-2 ring-orange-500/20', 
                checkClass: 'border-orange-500 bg-orange-500', 
                textClass: 'text-orange-900 dark:text-orange-100',
                preview: {
                  title: "Food Specials",
                  items: ["Daily Special", "Chef's Choice", "Featured Item"]
                }
              },
              { 
                key: 'includeDrinkSpecials', 
                label: 'Drink Specials', 
                icon: '🍺', 
                activeClass: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-md ring-2 ring-amber-500/20', 
                checkClass: 'border-amber-500 bg-amber-500', 
                textClass: 'text-amber-900 dark:text-amber-100',
                preview: {
                  title: "Drink Specials",
                  items: ["Beer Special", "Cocktail Deal", "Wine Selection"]
                }
              },
              { 
                key: 'includeHappyHour', 
                label: 'Happy Hour', 
                icon: '🎉', 
                activeClass: 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md ring-2 ring-pink-500/20', 
                checkClass: 'border-pink-500 bg-pink-500', 
                textClass: 'text-pink-900 dark:text-pink-100',
                preview: {
                  title: "Happy Hour",
                  subtitle: "4:00 PM - 6:00 PM",
                  body: "Daily specials and deals"
                }
              },
              { 
                key: 'includeEvents', 
                label: 'Upcoming Events', 
                icon: '📅', 
                activeClass: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md ring-2 ring-indigo-500/20', 
                checkClass: 'border-indigo-500 bg-indigo-500', 
                textClass: 'text-indigo-900 dark:text-indigo-100',
                preview: {
                  title: "Upcoming Events",
                  items: ["Live Music", "Trivia Night", "Special Event"]
                }
              },
              { 
                key: 'includeCustomSlides', 
                label: 'Custom Slides', 
                icon: '🎨', 
                activeClass: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md ring-2 ring-purple-500/20', 
                checkClass: 'border-purple-500 bg-purple-500', 
                textClass: 'text-purple-900 dark:text-purple-100',
                preview: {
                  title: "Custom Slides",
                  items: ["Promotional", "Announcements", "Special Messages"]
                }
              },
            ].map((item) => (
              <div key={item.key} className="flex flex-col gap-2">
                <label 
                  className={`relative flex items-center gap-2 p-2 rounded-lg border-2 transition-all cursor-pointer group ${
                    (config as any)[item.key]
                      ? item.activeClass
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(config as any)[item.key]}
                    onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked } as SignageConfig)}
                    className="sr-only"
                  />
                  <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    (config as any)[item.key]
                      ? item.checkClass
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 group-hover:border-gray-400'
                  }`}>
                    {(config as any)[item.key] && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{item.icon}</span>
                    <span className={`text-sm font-semibold ${
                      (config as any)[item.key]
                        ? item.textClass
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                </label>
                
                {/* Preview */}
                <div className={`rounded-lg border-2 p-2 bg-gradient-to-br ${
                  (config as any)[item.key]
                    ? item.key === 'includeWelcome' 
                      ? 'from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 border-yellow-300 dark:border-yellow-700'
                      : item.key === 'includeFoodSpecials'
                      ? 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-300 dark:border-orange-700'
                      : item.key === 'includeDrinkSpecials'
                      ? 'from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-300 dark:border-amber-700'
                      : item.key === 'includeHappyHour'
                      ? 'from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-800/10 border-pink-300 dark:border-pink-700'
                      : item.key === 'includeEvents'
                      ? 'from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10 border-indigo-300 dark:border-indigo-700'
                      : item.key === 'includeCustomSlides'
                      ? 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-300 dark:border-purple-700'
                      : 'from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10 border-indigo-300 dark:border-indigo-700'
                    : 'from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'
                }`}>
                  {item.key === 'includeWelcome' && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.preview.title}</div>
                      <div className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 truncate">{item.preview.subtitle}</div>
                      <div className="text-[10px] text-gray-700 dark:text-gray-300 truncate">{item.preview.body}</div>
                    </div>
                  )}
                  {item.key === 'includeHappyHour' && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.preview.title}</div>
                      <div className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 truncate">{item.preview.subtitle}</div>
                      <div className="text-[10px] text-gray-700 dark:text-gray-300 truncate">{item.preview.body}</div>
                    </div>
                  )}
                  {(item.key === 'includeFoodSpecials' || item.key === 'includeDrinkSpecials' || item.key === 'includeEvents' || item.key === 'includeCustomSlides') && (
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.preview.title}</div>
                      {item.preview.items?.map((previewItem, idx) => (
                        <div key={idx} className="text-[10px] text-gray-600 dark:text-gray-400 truncate">• {previewItem}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Events count dropdown - only show when events is enabled */}
                {item.key === 'includeEvents' && config.includeEvents && (
                  <div>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Show:</span>
                      <select
                        value={config.eventsTileCount}
                        onChange={(e) => setConfig({ ...config, eventsTileCount: Number(e.target.value) })}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white font-medium shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      >
                        {eventTileOptions.map((val) => (
                          <option key={val} value={val}>
                            {val} events
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

          {/* Custom Slides Section - only show when enabled */}
          {config.includeCustomSlides && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 rounded-lg shadow-md ring-1 ring-purple-500/20">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Custom Slides</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Create promotional or informational slides</p>
                  </div>
                </div>
                <button
                  onClick={addSlide}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Slide
                </button>
              </div>

              <div className="space-y-2.5">
        {existingSlides.length === 0 && !newSlide && (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 p-8 text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">No custom slides yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add slides to announce promos, events, or special messages
            </p>
          </div>
        )}

        {/* New Slide Form - Always at the top when open */}
        {newSlide && (
          <div
            className={`rounded-2xl border-2 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-3 md:p-4 transition-all border-purple-400 dark:border-purple-600 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-3 border-b border-gray-200/80 dark:border-gray-800/80">
              <div className="flex items-center gap-2.5">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-purple-500/20">
                  1
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Only show reorder buttons if there are 2+ slides total */}
                {(existingSlides.length + 1) > 1 && (
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5">
                    <button
                      onClick={() => moveSlide(newSlide.id, 'down')}
                      disabled={existingSlides.length === 0}
                      className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Delete Button - Separate */}
                <button
                  onClick={() => {
                    removeSlide(newSlide.id);
                    setNewSlideId(null);
                  }}
                  className="p-2 rounded-lg border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all hover:shadow-sm"
                  title="Delete slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                
                {/* Toggle Switch - Elegant */}
                <div className="flex items-center gap-2 px-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSlide.isEnabled !== false}
                      onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, isEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500/50 dark:peer-focus:ring-green-400/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 dark:peer-checked:bg-green-600 shadow-inner"></div>
                    <span className={`ml-2 text-xs font-semibold whitespace-nowrap ${
                      newSlide.isEnabled !== false 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {newSlide.isEnabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Slide Type Toggle - First option in the form */}
            <div className="mb-4 pb-4 border-b border-gray-200/80 dark:border-gray-800/80">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Slide Type
                </span>
                <div className="flex gap-2 p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      updateSlide(newSlide.id, (s) => ({ 
                        ...s, 
                        slideType: 'text',
                        // Clear image if switching to text
                        imageStorageKey: undefined,
                        imageUrl: undefined
                      }));
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        (newSlide.slideType || (newSlide.imageStorageKey ? 'image' : 'text')) === 'text'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md border-2 border-blue-500 dark:border-blue-400 transform scale-[1.02]'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Text Based
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateSlide(newSlide.id, (s) => ({ 
                        ...s, 
                        slideType: 'image',
                        // Clear footer if switching to image
                        footer: undefined
                      }));
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      (newSlide.slideType || (newSlide.imageStorageKey ? 'image' : 'text')) === 'image'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md border-2 border-blue-500 dark:border-blue-400 transform scale-[1.02]'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Image Based
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Image Selection Section */}
            {newSlide.imageStorageKey ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Image Preview - Compact on left */}
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Image Preview
                  </label>
                  <div className="relative rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 w-full flex items-center justify-center" style={{ height: '10vh', minHeight: '120px' }}>
                    <img
                      src={newSlide.imageStorageKey}
                      alt="Slide image"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => updateSlide(newSlide.id, (s) => ({ ...s, imageStorageKey: undefined, imageUrl: undefined }))}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors shadow-lg z-10"
                      title="Remove image"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {adGallery.length > 0 && (
                      <select
                        value={newSlide.imageStorageKey ? adGallery.find(a => a.storageKey === newSlide.imageStorageKey)?.id || '' : ''}
                        onChange={(e) => {
                          const assetId = e.target.value;
                          if (assetId) {
                            const asset = adGallery.find(a => a.id === assetId);
                            if (asset) {
                              updateSlide(newSlide.id, (s) => ({
                                ...s,
                                imageStorageKey: asset.storageKey,
                                imageUrl: asset.storageKey,
                              }));
                            }
                          } else {
                            updateSlide(newSlide.id, (s) => ({
                              ...s,
                              imageStorageKey: undefined,
                              imageUrl: undefined,
                            }));
                          }
                        }}
                        className="w-full px-2.5 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                      >
                        <option value="">Select from gallery...</option>
                        {adGallery.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.upload.originalFilename}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadingToGallery(false);
                        setUploadingForSlideId(newSlide.id);
                        setUploadModalOpen(true);
                      }}
                      className="w-full px-2.5 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Upload New
                      </span>
                    </button>
                  </div>
                </div>

                {/* Form Fields - On right */}
                <div className="md:col-span-2 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Title
                      </span>
                      <input
                        value={newSlide.title}
                        onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, title: e.target.value }))}
                        className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        placeholder="Slide title (admin only)"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">For admin organization only</span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                      <select
                        value={newSlide.accent || 'accent'}
                        onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, accent: e.target.value as 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan' }))}
                        className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white font-medium focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                      >
                        <option value="accent">Brand Red</option>
                        <option value="gold">Gold</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="purple">Purple</option>
                        <option value="orange">Orange</option>
                        <option value="teal">Teal</option>
                        <option value="pink">Pink</option>
                        <option value="cyan">Cyan</option>
                      </select>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Used for overlays if needed</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    The image will be displayed full screen on the TV. The title is only used for organization in this admin panel.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Image Upload Section - Only show for image-based slides */}
                {(newSlide.slideType || (newSlide.imageStorageKey ? 'image' : 'text')) === 'image' && (
                  <>
                    {/* Title field for image-based slides - always show so it's visible when collapsed */}
                    <div className="mb-3 pb-3 border-b border-gray-200/80 dark:border-gray-800/80">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Title <span className="text-gray-500 dark:text-gray-400">(for admin organization only)</span>
                        </span>
                        <input
                          value={newSlide.title}
                          onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, title: e.target.value }))}
                          className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          placeholder="Slide title (admin only)"
                        />
                      </label>
                    </div>
                    <div className="mb-4 pb-4 border-b border-gray-200/80 dark:border-gray-800/80">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Image <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        {adGallery.length > 0 && (
                          <select
                            value={newSlide.imageStorageKey ? adGallery.find(a => a.storageKey === newSlide.imageStorageKey)?.id || '' : ''}
                            onChange={(e) => {
                              const assetId = e.target.value;
                              if (assetId) {
                                const asset = adGallery.find(a => a.id === assetId);
                                if (asset) {
                                  updateSlide(newSlide.id, (s) => ({
                                    ...s,
                                    imageStorageKey: asset.storageKey,
                                    imageUrl: asset.storageKey,
                                  }));
                                }
                              } else {
                                updateSlide(newSlide.id, (s) => ({
                                  ...s,
                                  imageStorageKey: undefined,
                                  imageUrl: undefined,
                                }));
                              }
                            }}
                            className="flex-1 px-3 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          >
                            <option value="">Select from gallery...</option>
                            {adGallery.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.upload.originalFilename}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadingToGallery(false);
                            setUploadingForSlideId(newSlide.id);
                            setUploadModalOpen(true);
                          }}
                          className="px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Upload Image
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Text Content - Only show for text-based slides */}
                {(newSlide.slideType || (newSlide.imageStorageKey ? 'image' : 'text')) === 'text' && (
                <div className="space-y-2.5">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Title</span>
                      <input
                        value={newSlide.title}
                        onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, title: e.target.value }))}
                        className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        placeholder="Main heading"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Subtitle</span>
                      <input
                        value={newSlide.subtitle || ''}
                        onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, subtitle: e.target.value }))}
                        className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        placeholder="Secondary text"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Body Text</span>
                    <textarea
                      value={newSlide.body || ''}
                      onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, body: e.target.value }))}
                      rows={2}
                      className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                      placeholder="Main content text"
                    />
                  </label>

                  {/* Only show footer for text-based slides */}
                  {(newSlide.slideType || (newSlide.imageStorageKey ? 'image' : 'text')) === 'text' && (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Footer</span>
                        <input
                          value={newSlide.footer || ''}
                          onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, footer: e.target.value }))}
                          className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          placeholder="Footer text"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                        <select
                          value={newSlide.accent || 'accent'}
                          onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, accent: e.target.value as 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan' }))}
                          className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white font-medium focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        >
                          <option value="accent">Brand Red</option>
                          <option value="gold">Gold</option>
                          <option value="blue">Blue</option>
                          <option value="green">Green</option>
                          <option value="purple">Purple</option>
                          <option value="orange">Orange</option>
                          <option value="teal">Teal</option>
                          <option value="pink">Pink</option>
                          <option value="cyan">Cyan</option>
                        </select>
                      </label>
                    </div>
                  )}
                  {(newSlide.slideType || (newSlide.imageStorageKey ? 'image' : 'text')) === 'image' && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSlide.showBorder !== false}
                          onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, showBorder: e.target.checked }))}
                          className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Show Border</span>
                      </label>
                      {newSlide.showBorder !== false && (
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                          <select
                            value={newSlide.accent || 'accent'}
                            onChange={(e) => updateSlide(newSlide.id, (s) => ({ ...s, accent: e.target.value as 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan' }))}
                            className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white font-medium focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          >
                            <option value="accent">Brand Red</option>
                            <option value="gold">Gold</option>
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="purple">Purple</option>
                            <option value="orange">Orange</option>
                            <option value="teal">Teal</option>
                            <option value="pink">Pink</option>
                            <option value="cyan">Cyan</option>
                          </select>
                        </label>
                      )}
                    </>
                  )}
                </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Existing Slides */}
        {existingSlides.map((slide, idx) => {
          const isExpanded = expandedSlideId === slide.id;
          const actualIdx = newSlide ? idx + 1 : idx;
          
          return (
            <div
              key={slide.id}
              className={`rounded-2xl border-2 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 transition-all ${
                slide.isEnabled !== false
                  ? 'border-gray-200/80 dark:border-gray-800/80 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xl'
                  : 'border-gray-200/50 dark:border-gray-800/50 opacity-60'
              }`}
            >
              {/* Collapsed Header */}
              <div 
                className="flex flex-wrap items-center justify-between gap-2.5 p-3 md:p-4 cursor-pointer"
                onClick={() => toggleSlideExpansion(slide.id)}
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-purple-500/20">
                    {actualIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {slide.title || 'Untitled Slide'}
                    </p>
                    {slide.imageStorageKey && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Image slide</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Collapse/Edit Button - Visually distinct */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSlideExpansion(slide.id);
                    }}
                    className="p-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-sm"
                    title={isExpanded ? "Collapse" : "Expand to edit"}
                  >
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Only show reorder buttons if there are 2+ slides total */}
                  {(existingSlides.length + (newSlide ? 1 : 0)) > 1 && (
                    <>
                      {/* Divider */}
                      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                      
                      {/* Reorder Buttons - Grouped together */}
                      <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(slide.id, 'up');
                          }}
                          disabled={actualIdx === 0 && !newSlide}
                          className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(slide.id, 'down');
                          }}
                          disabled={actualIdx === existingSlides.length - 1}
                          className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                  
                  {/* Delete Button - Separate */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlide(slide.id);
                    }}
                    className="p-2 rounded-lg border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all hover:shadow-sm"
                    title="Delete slide"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  {/* Toggle Switch - Elegant */}
                  <div className="flex items-center gap-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slide.isEnabled !== false}
                        onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, isEnabled: e.target.checked }))}
                        className="sr-only peer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500/50 dark:peer-focus:ring-green-400/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 dark:peer-checked:bg-green-600 shadow-inner"></div>
                      <span className={`ml-2 text-xs font-semibold whitespace-nowrap ${
                        slide.isEnabled !== false 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {slide.isEnabled !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Expanded Form Content */}
              {isExpanded && (
                <div className="border-t border-gray-200/80 dark:border-gray-800/80 pt-4 px-3 md:px-4 pb-4">
                  {slide.imageStorageKey ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Image Preview - Compact on left */}
                      <div className="md:col-span-1 space-y-2">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Image Preview
                        </label>
                        <div className="relative rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 w-full flex items-center justify-center" style={{ height: '10vh', minHeight: '120px' }}>
                          <img
                            src={slide.imageStorageKey}
                            alt="Slide image"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => updateSlide(slide.id, (s) => ({ ...s, imageStorageKey: undefined, imageUrl: undefined }))}
                            className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors shadow-lg z-10"
                            title="Remove image"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {adGallery.length > 0 && (
                            <select
                              value={slide.imageStorageKey ? adGallery.find(a => a.storageKey === slide.imageStorageKey)?.id || '' : ''}
                              onChange={(e) => {
                                const assetId = e.target.value;
                                if (assetId) {
                                  const asset = adGallery.find(a => a.id === assetId);
                                  if (asset) {
                                    updateSlide(slide.id, (s) => ({
                                      ...s,
                                      imageStorageKey: asset.storageKey,
                                      imageUrl: asset.storageKey,
                                    }));
                                  }
                                } else {
                                  updateSlide(slide.id, (s) => ({
                                    ...s,
                                    imageStorageKey: undefined,
                                    imageUrl: undefined,
                                  }));
                                }
                              }}
                              className="w-full px-2.5 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                            >
                              <option value="">Select from gallery...</option>
                              {adGallery.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.upload.originalFilename}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setUploadingToGallery(false);
                              setUploadingForSlideId(slide.id);
                              setUploadModalOpen(true);
                            }}
                            className="w-full px-2.5 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Upload New
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Form Fields - On right */}
                      <div className="md:col-span-2 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Title
                            </span>
                            <input
                              value={slide.title}
                              onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, title: e.target.value }))}
                              className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                              placeholder="Slide title (admin only)"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">For admin organization only</span>
                          </label>
                          <>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={slide.showBorder !== false}
                                onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, showBorder: e.target.checked }))}
                                className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                              />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Show Border</span>
                            </label>
                            {slide.showBorder !== false && (
                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                                <select
                                  value={slide.accent || 'accent'}
                                  onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, accent: e.target.value as 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan' }))}
                                  className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white font-medium focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                >
                                  <option value="accent">Brand Red</option>
                                  <option value="gold">Gold</option>
                                  <option value="blue">Blue</option>
                                  <option value="green">Green</option>
                                  <option value="purple">Purple</option>
                                  <option value="orange">Orange</option>
                                  <option value="teal">Teal</option>
                                  <option value="pink">Pink</option>
                                  <option value="cyan">Cyan</option>
                                </select>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Used for border color</span>
                              </label>
                            )}
                          </>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                          The image will be displayed full screen on the TV. The title is only used for organization in this admin panel.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Title field for image-based slides - always show so it's visible when collapsed */}
                      {(slide.slideType || (slide.imageStorageKey ? 'image' : 'text')) === 'image' && (
                        <div className="mb-3 pb-3 border-b border-gray-200/80 dark:border-gray-800/80">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Title <span className="text-gray-500 dark:text-gray-400">(for admin organization only)</span>
                            </span>
                            <input
                              value={slide.title}
                              onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, title: e.target.value }))}
                              className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                              placeholder="Slide title (admin only)"
                            />
                          </label>
                        </div>
                      )}
                      {/* Image Selection Section */}
                      {(slide.slideType || (slide.imageStorageKey ? 'image' : 'text')) === 'image' && (
                        <div className="mb-4 pb-4 border-b border-gray-200/80 dark:border-gray-800/80">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Image <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            {adGallery.length > 0 && (
                              <select
                                value={slide.imageStorageKey ? adGallery.find(a => a.storageKey === slide.imageStorageKey)?.id || '' : ''}
                                onChange={(e) => {
                                  const assetId = e.target.value;
                                  if (assetId) {
                                    const asset = adGallery.find(a => a.id === assetId);
                                    if (asset) {
                                      updateSlide(slide.id, (s) => ({
                                        ...s,
                                        imageStorageKey: asset.storageKey,
                                        imageUrl: asset.storageKey,
                                      }));
                                    }
                                  } else {
                                    updateSlide(slide.id, (s) => ({
                                      ...s,
                                      imageStorageKey: undefined,
                                      imageUrl: undefined,
                                    }));
                                  }
                                }}
                                className="flex-1 px-3 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                              >
                                <option value="">Select from gallery...</option>
                                {adGallery.map((asset) => (
                                  <option key={asset.id} value={asset.id}>
                                    {asset.upload.originalFilename}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setUploadingToGallery(false);
                                setUploadingForSlideId(slide.id);
                                setUploadModalOpen(true);
                              }}
                              className="px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                            >
                              <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Upload Image
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Text Content - Only show for text-based slides */}
                      {(slide.slideType || (slide.imageStorageKey ? 'image' : 'text')) === 'text' && (
                      <div className="space-y-2.5">
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Title</span>
                            <input
                              value={slide.title}
                              onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, title: e.target.value }))}
                              className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                              placeholder="Main heading"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Subtitle</span>
                            <input
                              value={slide.subtitle || ''}
                              onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, subtitle: e.target.value }))}
                              className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                              placeholder="Secondary text"
                            />
                          </label>
                        </div>

                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Body Text</span>
                          <textarea
                            value={slide.body || ''}
                            onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, body: e.target.value }))}
                            rows={2}
                            className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                            placeholder="Main content text"
                          />
                        </label>

                        {/* Only show footer for text-based slides */}
                        {(slide.slideType || (slide.imageStorageKey ? 'image' : 'text')) === 'text' ? (
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Footer</span>
                              <input
                                value={slide.footer || ''}
                                onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, footer: e.target.value }))}
                                className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                placeholder="Footer text"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                              <select
                                value={slide.accent || 'accent'}
                                onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, accent: e.target.value as 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan' }))}
                                className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white font-medium focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                              >
                                <option value="accent">Brand Red</option>
                                <option value="gold">Gold</option>
                                <option value="blue">Blue</option>
                                <option value="green">Green</option>
                                <option value="purple">Purple</option>
                                <option value="orange">Orange</option>
                                <option value="teal">Teal</option>
                                <option value="pink">Pink</option>
                                <option value="cyan">Cyan</option>
                              </select>
                            </label>
                          </div>
                        ) : (
                          <>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={slide.showBorder !== false}
                                onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, showBorder: e.target.checked }))}
                                className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                              />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Show Border</span>
                            </label>
                            {slide.showBorder !== false && (
                              <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                                <select
                                  value={slide.accent || 'accent'}
                                  onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, accent: e.target.value as 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan' }))}
                                  className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white font-medium focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                >
                                  <option value="accent">Brand Red</option>
                                  <option value="gold">Gold</option>
                                  <option value="blue">Blue</option>
                                  <option value="green">Green</option>
                                  <option value="purple">Purple</option>
                                  <option value="orange">Orange</option>
                                  <option value="teal">Teal</option>
                                  <option value="pink">Pink</option>
                                  <option value="cyan">Cyan</option>
                                </select>
                              </label>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
                </div>
              )}
            </div>
          );
        })}
        </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="space-y-4">
          {/* Ad Gallery Section */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-xl shadow-lg ring-2 ring-orange-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Ad Gallery</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Upload images (JPG, PNG, PDF) to use in custom slides</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadingToGallery(true);
                  setUploadModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Image
              </button>
            </div>

            {adGallery.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">No images in gallery yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Upload images to use in your custom slides
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {adGallery.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative group rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square shadow-sm hover:shadow-md transition-all hover:scale-[1.02] hover:border-orange-300 dark:hover:border-orange-700"
                  >
                    <img
                      src={asset.storageKey}
                      alt={asset.upload.originalFilename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                      <p className="text-white text-xs font-medium px-2 pb-2 text-center truncate w-full">
                        {asset.upload.originalFilename}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(asset);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-lg hover:scale-110 z-10"
                      title="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-save Status Indicator */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-sm transition-all ${
          saveStatus === 'saving' 
            ? 'bg-blue-500/90 text-white' 
            : saveStatus === 'saved'
            ? 'bg-green-500/90 text-white'
            : saveStatus === 'error'
            ? 'bg-red-500/90 text-white'
            : 'bg-gray-500/90 text-white opacity-0 pointer-events-none'
        }`}>
          {saveStatus === 'saving' && (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm font-medium">Save failed</span>
            </>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <SignageUploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadingToGallery(false);
          setUploadingForSlideId(null);
        }}
        onUploadComplete={(result) => {
          if (uploadingToGallery) {
            handleGalleryUpload(result);
          } else if (uploadingForSlideId && result.assets.length > 0) {
            // Uploading for a specific slide - assign the first asset to that slide
            const asset = result.assets[0];
            updateSlide(uploadingForSlideId, (s) => ({
              ...s,
              imageStorageKey: asset.storageKey,
              imageUrl: asset.storageKey,
            }));
            setUploadModalOpen(false);
            setUploadingForSlideId(null);
            showToast('Image uploaded and assigned to slide', 'success');
            // Also refresh gallery to include the new image
            fetchAdGallery();
          } else {
            // Fallback: just add to gallery
            handleGalleryUpload(result);
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteConfirmOpen(false);
            setAssetToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Image"
        message={
          assetToDelete
            ? `Are you sure you want to delete "${assetToDelete.upload.originalFilename}"? This action cannot be undone.`
            : 'Are you sure you want to delete this image?'
        }
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="danger"
        disabled={deleting}
      />
    </div>
  );
}

