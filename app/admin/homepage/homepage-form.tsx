'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { showToast } from '@/components/toast';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

interface HomepageFormProps {
  initialHero: any;
  initialAbout: any;
  initialGallery: any;
}

export default function HomepageForm({ initialHero, initialAbout, initialGallery }: HomepageFormProps) {
  const router = useRouter();
  const [heroLoading, setHeroLoading] = useState(false);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  
  const initialHeroData = {
    title: initialHero?.title || "Monaghan's",
    tagline: initialHero?.tagline || "Bar & Grill",
    subtitle: initialHero?.subtitle || "Established 1892 • Denver's Second-Oldest Bar • Minority Woman Owned",
    image: initialHero?.image || '/pics/hero.png',
  };

  const initialAboutData = {
    title: initialAbout?.title || "A Neighborhood Institution",
    paragraph1: initialAbout?.paragraph1 || "Since 1892, Monaghan's has been the heart of the Sheridan neighborhood—Denver's second-oldest bar and a true local landmark. For over 130 years, we've been where neighbors gather, stories are shared, and traditions are made.",
    paragraph2Title: initialAbout?.paragraph2Title || "A Woman-Owned Legacy",
    paragraph2: initialAbout?.paragraph2 || "After over a decade of dedicated service behind the bar, our owner purchased Monaghan's, continuing a legacy of community, hospitality, and genuine neighborhood spirit. We're proud to carry forward the traditions that make this place special.",
    paragraph3: initialAbout?.paragraph3 || "From our famous Green Chili to our daily BOGO Happy Hour, from catching the game to enjoying live music, Monaghan's is where great food, cold drinks, and warm community come together.",
    linkText: initialAbout?.linkText || "Learn More About Our Story",
    linkUrl: initialAbout?.linkUrl || "/about",
  };

  const initialGalleryData = {
    title: initialGallery?.title || "Inside Monaghan's",
  };
  
  // Store initial values in refs to compare against
  const initialHeroRef = useRef(initialHeroData);
  const initialAboutRef = useRef(initialAboutData);
  const initialGalleryRef = useRef(initialGalleryData);
  
  // Update refs when props change (after save)
  useEffect(() => {
    initialHeroRef.current = initialHeroData;
    setIsHeroDirty(false);
  }, [initialHero?.title, initialHero?.tagline, initialHero?.subtitle, initialHero?.image]);

  useEffect(() => {
    initialAboutRef.current = initialAboutData;
    setIsAboutDirty(false);
  }, [initialAbout?.title, initialAbout?.paragraph1, initialAbout?.paragraph2Title, initialAbout?.paragraph2, initialAbout?.paragraph3, initialAbout?.linkText, initialAbout?.linkUrl]);

  useEffect(() => {
    initialGalleryRef.current = initialGalleryData;
    setIsGalleryDirty(false);
  }, [initialGallery?.title]);
  
  const [hero, setHero] = useState(initialHeroData);
  const [about, setAbout] = useState(initialAboutData);
  const [gallery, setGallery] = useState(initialGalleryData);

  // Track dirty state
  const [isHeroDirty, setIsHeroDirty] = useState(false);
  const [isAboutDirty, setIsAboutDirty] = useState(false);
  const [isGalleryDirty, setIsGalleryDirty] = useState(false);

  // Check if forms are dirty (exclude image field since it can't be changed)
  useEffect(() => {
    const { image: _, ...heroWithoutImage } = hero;
    const { image: __, ...initialHeroWithoutImage } = initialHeroRef.current;
    setIsHeroDirty(JSON.stringify(heroWithoutImage) !== JSON.stringify(initialHeroWithoutImage));
  }, [hero]);

  useEffect(() => {
    setIsAboutDirty(JSON.stringify(about) !== JSON.stringify(initialAboutRef.current));
  }, [about]);

  useEffect(() => {
    setIsGalleryDirty(JSON.stringify(gallery) !== JSON.stringify(initialGalleryRef.current));
  }, [gallery]);

  // Warn user before leaving page with unsaved changes
  const hasUnsavedChanges = isHeroDirty || isAboutDirty || isGalleryDirty;
  useUnsavedChangesWarning(hasUnsavedChanges);

  async function handleSaveHero() {
    setHeroLoading(true);
    try {
      // Exclude image from being saved - keep the original value
      const heroToSave = {
        ...hero,
        image: initialHeroRef.current.image,
      };
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'homepageHero',
          value: heroToSave,
          description: 'Homepage hero section content',
        }),
      });
      router.refresh();
      setIsHeroDirty(false);
      initialHeroRef.current = heroToSave;
      showToast('Hero section saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save hero section', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setHeroLoading(false);
    }
  }

  function handleCancelHero() {
    setHero(initialHeroRef.current);
    setIsHeroDirty(false);
  }

  async function handleSaveAbout() {
    setAboutLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'homepageAbout',
          value: about,
          description: 'Homepage about section content',
        }),
      });
      router.refresh();
      setIsAboutDirty(false);
      initialAboutRef.current = about;
      showToast('About section saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save about section', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setAboutLoading(false);
    }
  }

  function handleCancelAbout() {
    setAbout(initialAboutRef.current);
    setIsAboutDirty(false);
  }

  async function handleSaveGallery() {
    setGalleryLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'homepageGallery',
          value: gallery,
          description: 'Homepage gallery section content',
        }),
      });
      router.refresh();
      setIsGalleryDirty(false);
      initialGalleryRef.current = gallery;
      showToast('Gallery section saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save gallery section', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setGalleryLoading(false);
    }
  }

  function handleCancelGallery() {
    setGallery(initialGalleryRef.current);
    setIsGalleryDirty(false);
  }

  const [activeTab, setActiveTab] = useState('hero');

  const tabs = [
    { id: 'hero', label: 'Hero', dirty: isHeroDirty },
    { id: 'about', label: 'About', dirty: isAboutDirty },
    { id: 'gallery', label: 'Gallery', dirty: isGalleryDirty },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md">
      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-2 py-1">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap relative ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t border-l border-r border-gray-300 dark:border-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {tab.dirty && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Hero Section */}
          {activeTab === 'hero' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Hero Section</h2>
                <div className="flex gap-1.5">
                  {isHeroDirty && (
                    <button
                      type="button"
                      onClick={handleCancelHero}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHero}
                    disabled={heroLoading || !isHeroDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {heroLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label htmlFor="heroTitle" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Main Title</label>
                  <input
                    id="heroTitle"
                    type="text"
                    value={hero.title}
                    onChange={(e) => setHero({ ...hero, title: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="Monaghan's"
                  />
                </div>
                <div>
                  <label htmlFor="heroTagline" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Tagline</label>
                  <input
                    id="heroTagline"
                    type="text"
                    value={hero.tagline}
                    onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="Bar & Grill"
                  />
                </div>
                <div>
                  <label htmlFor="heroSubtitle" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Subtitle</label>
                  <input
                    id="heroSubtitle"
                    type="text"
                    value={hero.subtitle}
                    onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="Established 1892 • Denver's Second-Oldest Bar • Minority Woman Owned"
                  />
                </div>
                <div>
                  <label htmlFor="heroImage" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Hero Image Path</label>
                  <input
                    id="heroImage"
                    type="text"
                    value={hero.image || '/pics/hero.png'}
                    onChange={(e) => setHero({ ...hero, image: e.target.value })}
                    disabled
                    className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-60"
                    placeholder="/pics/hero.png"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Hero image path cannot be modified. Images are automatically selected based on events and specials.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* About Section */}
          {activeTab === 'about' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">About Section</h2>
                <div className="flex gap-1.5">
                  {isAboutDirty && (
                    <button
                      type="button"
                      onClick={handleCancelAbout}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAbout}
                    disabled={aboutLoading || !isAboutDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {aboutLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label htmlFor="aboutTitle" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Section Title</label>
                  <input
                    id="aboutTitle"
                    type="text"
                    value={about.title}
                    onChange={(e) => setAbout({ ...about, title: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="A Neighborhood Institution"
                  />
                </div>
                <div>
                  <label htmlFor="aboutParagraph1" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">First Paragraph</label>
                  <textarea
                    id="aboutParagraph1"
                    value={about.paragraph1}
                    onChange={(e) => setAbout({ ...about, paragraph1: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-y min-h-[60px]"
                    placeholder="First paragraph content..."
                  />
                </div>
                <div>
                  <label htmlFor="aboutParagraph2Title" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Second Paragraph Title (Bold)</label>
                  <input
                    id="aboutParagraph2Title"
                    type="text"
                    value={about.paragraph2Title}
                    onChange={(e) => setAbout({ ...about, paragraph2Title: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="A Woman-Owned Legacy"
                  />
                </div>
                <div>
                  <label htmlFor="aboutParagraph2" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Second Paragraph</label>
                  <textarea
                    id="aboutParagraph2"
                    value={about.paragraph2}
                    onChange={(e) => setAbout({ ...about, paragraph2: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-y min-h-[60px]"
                    placeholder="Second paragraph content..."
                  />
                </div>
                <div>
                  <label htmlFor="aboutParagraph3" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Third Paragraph</label>
                  <textarea
                    id="aboutParagraph3"
                    value={about.paragraph3}
                    onChange={(e) => setAbout({ ...about, paragraph3: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-y min-h-[60px]"
                    placeholder="Third paragraph content..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="aboutLinkText" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Link Text</label>
                    <input
                      id="aboutLinkText"
                      type="text"
                      value={about.linkText}
                      onChange={(e) => setAbout({ ...about, linkText: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      placeholder="Learn More About Our Story"
                    />
                  </div>
                  <div>
                    <label htmlFor="aboutLinkUrl" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Link URL</label>
                    <input
                      id="aboutLinkUrl"
                      type="text"
                      value={about.linkUrl}
                      onChange={(e) => setAbout({ ...about, linkUrl: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      placeholder="/about"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gallery Section */}
          {activeTab === 'gallery' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Gallery Section</h2>
                <div className="flex gap-1.5">
                  {isGalleryDirty && (
                    <button
                      type="button"
                      onClick={handleCancelGallery}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveGallery}
                    disabled={galleryLoading || !isGalleryDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {galleryLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="galleryTitle" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Section Title</label>
                <input
                  id="galleryTitle"
                  type="text"
                  value={gallery.title}
                  onChange={(e) => setGallery({ ...gallery, title: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  placeholder="Inside Monaghan's"
                />
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Image Upload Coming Soon</p>
                <p>For now, please email pictures to jt</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

