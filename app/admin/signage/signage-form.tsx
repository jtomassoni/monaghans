'use client';

import { useMemo, useState } from 'react';
import { showToast } from '@/components/toast';

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
};

type SignageConfig = {
  includeFoodSpecials: boolean;
  includeDrinkSpecials: boolean;
  includeHappyHour: boolean;
  includeEvents: boolean;
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

export default function SignageForm({ initialConfig }: Props) {
  const [config, setConfig] = useState<SignageConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  const slideDurationOptions = useMemo(() => {
    const options: number[] = [5];
    for (let v = 15; v <= 120; v += 15) options.push(v);
    if (!options.includes(config.slideDurationSec)) options.push(config.slideDurationSec);
    return options.sort((a, b) => a - b);
  }, [config.slideDurationSec]);

  const fadeDurationOptions = useMemo(() => {
    const options: number[] = [];
    for (let v = 1; v <= 4; v += 0.5) options.push(Number(v.toFixed(1)));
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

  const sortedSlides = useMemo(() => {
    return [...(config.customSlides || [])]
      .map((slide, idx) => ({ ...slide, position: typeof slide.position === 'number' ? slide.position : idx + 1 }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [config.customSlides]);

  const updateSlide = (id: string, updater: (slide: SignageSlide) => SignageSlide) => {
    setConfig((prev) => ({
      ...prev,
      customSlides: (prev.customSlides || []).map((slide) => (slide.id === id ? updater(slide) : slide)),
    }));
  };

  const addSlide = () => {
    setConfig((prev) => ({
      ...prev,
      customSlides: [
        ...(prev.customSlides || []),
        {
          id: uuid(),
          label: 'Custom',
          title: 'New Slide',
          subtitle: '',
          body: '',
          accent: 'accent',
          footer: '',
          position: (prev.customSlides?.length || 0) + 1,
          isEnabled: true,
        },
      ],
    }));
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

  const handleSave = async () => {
    setSaving(true);
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
      showToast('Saved! The TV page will use these settings on next refresh.', 'success', 'Refresh the TV page to apply.');
    } catch (err: any) {
      const message = err?.message || 'Save failed';
      showToast(message, 'error', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Playlist Settings Card */}
      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Playlist Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure timing and content display</p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <label className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Slide Duration</span>
            </div>
            <select
              value={config.slideDurationSec}
              onChange={(e) => setConfig({ ...config, slideDurationSec: Number(e.target.value) })}
              className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm hover:border-blue-300 dark:hover:border-blue-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
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
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fade Duration</span>
            </div>
            <select
              value={config.fadeDurationSec}
              onChange={(e) => setConfig({ ...config, fadeDurationSec: Number(e.target.value) })}
              className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm hover:border-blue-300 dark:hover:border-blue-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            >
              {fadeDurationOptions.map((val) => (
                <option key={val} value={val}>
                  {val} seconds
                </option>
              ))}
            </select>
          </label>
          {config.includeEvents && (
            <label className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Events to Show</span>
              </div>
              <select
                value={config.eventsTileCount}
                onChange={(e) => setConfig({ ...config, eventsTileCount: Number(e.target.value) })}
                className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white font-medium shadow-sm hover:border-blue-300 dark:hover:border-blue-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              >
                {eventTileOptions.map((val) => (
                  <option key={val} value={val}>
                    {val} events
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Content Display</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              { key: 'includeFoodSpecials', label: 'Food Specials', icon: '🍽️' },
              { key: 'includeDrinkSpecials', label: 'Drink Specials', icon: '🍺' },
              { key: 'includeHappyHour', label: 'Happy Hour', icon: '🎉' },
              { key: 'includeEvents', label: 'Upcoming Events', icon: '📅' },
            ].map((item) => (
              <label 
                key={item.key} 
                className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  (config as any)[item.key]
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
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
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                }`}>
                  {(config as any)[item.key] && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xl">{item.icon}</span>
                  <span className={`text-sm font-medium ${
                    (config as any)[item.key]
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {item.label}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Slides Section */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Custom Slides</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create promotional or informational slides</p>
          </div>
        </div>
        <button
          onClick={addSlide}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all hover:shadow-xl"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Slide
        </button>
      </div>

      <div className="space-y-4">
        {sortedSlides.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-12 text-center">
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No custom slides yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Add slides to announce promos, events, or special messages
            </p>
          </div>
        )}

        {sortedSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`rounded-2xl border-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg p-6 transition-all ${
              slide.isEnabled !== false
                ? 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                : 'border-gray-200 dark:border-gray-800 opacity-60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                  {idx + 1}
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slide.isEnabled !== false}
                    onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, isEnabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    title="Enable/disable slide"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {slide.isEnabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveSlide(slide.id, 'up')}
                  disabled={idx === 0}
                  className="p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveSlide(slide.id, 'down')}
                  disabled={idx === sortedSlides.length - 1}
                  className="p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => removeSlide(slide.id)}
                  className="p-2 rounded-lg border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Remove slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</span>
                <input
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, title: e.target.value }))}
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="Main heading"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle</span>
                <input
                  value={slide.subtitle || ''}
                  onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, subtitle: e.target.value }))}
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="Secondary text"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Body Text</span>
              <textarea
                value={slide.body || ''}
                onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, body: e.target.value }))}
                rows={3}
                className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                placeholder="Main content text"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Footer</span>
                <input
                  value={slide.footer || ''}
                  onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, footer: e.target.value }))}
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="Footer text"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
                <select
                  value={slide.accent || 'accent'}
                  onChange={(e) => updateSlide(slide.id, (s) => ({ ...s, accent: e.target.value as 'accent' | 'gold' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'cyan' }))}
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white font-medium focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
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
          </div>
        ))}
      </div>

      {/* Save Section */}
      <div className="rounded-2xl border-2 border-gray-200/60 dark:border-gray-800/60 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900/50 dark:to-gray-800/50 backdrop-blur-sm shadow-xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Changes apply immediately
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                The TV display reads this configuration live. Refresh the TV page to see updates.
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl min-w-[160px]"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

