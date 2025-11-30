'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import TimePicker from '@/components/time-picker';

interface HomepageFormProps {
  initialHero: any;
  initialAbout: any;
  initialGallery: any;
  initialContact: any;
  initialHours: any;
  initialMapEmbed: any;
  initialHappyHour: any;
}

export default function HomepageForm({ initialHero, initialAbout, initialGallery, initialContact, initialHours, initialMapEmbed, initialHappyHour }: HomepageFormProps) {
  const router = useRouter();
  const [heroLoading, setHeroLoading] = useState(false);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [happyHourLoading, setHappyHourLoading] = useState(false);
  
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

  const initialContactData = {
    address: initialContact?.address || '',
    city: initialContact?.city || '',
    state: initialContact?.state || '',
    zip: initialContact?.zip || '',
    phone: initialContact?.phone || '',
    email: initialContact?.email || '',
  };

  const initialHoursData = {
    monday: initialHours?.monday || { open: '10:00', close: '' },
    tuesday: initialHours?.tuesday || { open: '10:00', close: '' },
    wednesday: initialHours?.wednesday || { open: '10:00', close: '' },
    thursday: initialHours?.thursday || { open: '10:00', close: '' },
    friday: initialHours?.friday || { open: '10:00', close: '' },
    saturday: initialHours?.saturday || { open: '', close: '' },
    sunday: initialHours?.sunday || { open: '', close: '' },
  };

  const initialMapEmbedData = {
    url: initialMapEmbed?.url || '',
    enabled: initialMapEmbed?.enabled ?? true,
  };

  const initialHappyHourData = {
    enabled: initialHappyHour?.enabled ?? false,
    title: initialHappyHour?.title || 'Buy One Get One',
    description: initialHappyHour?.description || 'BOGO on Wine, Well & Drafts',
    times: initialHappyHour?.times || '10am-12pm & 4pm-7pm',
    details: initialHappyHour?.details || 'On your first round',
  };
  
  // Store initial values in refs to compare against
  const initialHeroRef = useRef(initialHeroData);
  const initialAboutRef = useRef(initialAboutData);
  const initialGalleryRef = useRef(initialGalleryData);
  const initialContactRef = useRef(initialContactData);
  const initialHoursRef = useRef(initialHoursData);
  const initialMapEmbedRef = useRef(initialMapEmbedData);
  const initialHappyHourRef = useRef(initialHappyHourData);
  
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

  useEffect(() => {
    initialContactRef.current = initialContactData;
    setIsContactDirty(false);
  }, [initialContact?.address, initialContact?.city, initialContact?.state, initialContact?.zip, initialContact?.phone, initialContact?.email]);

  useEffect(() => {
    initialHoursRef.current = initialHoursData;
    setIsHoursDirty(false);
  }, [initialHours?.monday, initialHours?.tuesday, initialHours?.wednesday, initialHours?.thursday, initialHours?.friday, initialHours?.saturday, initialHours?.sunday]);

  useEffect(() => {
    initialMapEmbedRef.current = initialMapEmbedData;
    setIsMapDirty(false);
  }, [initialMapEmbed?.url, initialMapEmbed?.enabled]);

  useEffect(() => {
    initialHappyHourRef.current = initialHappyHourData;
    setIsHappyHourDirty(false);
  }, [initialHappyHour?.enabled, initialHappyHour?.title, initialHappyHour?.description, initialHappyHour?.times, initialHappyHour?.details]);
  
  const [hero, setHero] = useState(initialHeroData);
  const [about, setAbout] = useState(initialAboutData);
  const [gallery, setGallery] = useState(initialGalleryData);
  const [contact, setContact] = useState(initialContactData);
  const [hours, setHours] = useState(initialHoursData);
  const [mapEmbed, setMapEmbed] = useState(initialMapEmbedData);
  const [happyHour, setHappyHour] = useState(initialHappyHourData);

  // Track dirty state
  const [isHeroDirty, setIsHeroDirty] = useState(false);
  const [isAboutDirty, setIsAboutDirty] = useState(false);
  const [isGalleryDirty, setIsGalleryDirty] = useState(false);
  const [isContactDirty, setIsContactDirty] = useState(false);
  const [isHoursDirty, setIsHoursDirty] = useState(false);
  const [isMapDirty, setIsMapDirty] = useState(false);
  const [isHappyHourDirty, setIsHappyHourDirty] = useState(false);

  // Check if forms are dirty
  useEffect(() => {
    setIsHeroDirty(JSON.stringify(hero) !== JSON.stringify(initialHeroRef.current));
  }, [hero]);

  useEffect(() => {
    setIsAboutDirty(JSON.stringify(about) !== JSON.stringify(initialAboutRef.current));
  }, [about]);

  useEffect(() => {
    setIsGalleryDirty(JSON.stringify(gallery) !== JSON.stringify(initialGalleryRef.current));
  }, [gallery]);

  useEffect(() => {
    setIsContactDirty(JSON.stringify(contact) !== JSON.stringify(initialContactRef.current));
  }, [contact]);

  useEffect(() => {
    setIsHoursDirty(JSON.stringify(hours) !== JSON.stringify(initialHoursRef.current));
  }, [hours]);

  useEffect(() => {
    setIsMapDirty(JSON.stringify(mapEmbed) !== JSON.stringify(initialMapEmbedRef.current));
  }, [mapEmbed]);

  useEffect(() => {
    setIsHappyHourDirty(JSON.stringify(happyHour) !== JSON.stringify(initialHappyHourRef.current));
  }, [happyHour]);

  // Warn user before leaving page with unsaved changes
  const hasUnsavedChanges = isHeroDirty || isAboutDirty || isGalleryDirty || isContactDirty || isHoursDirty || isMapDirty || isHappyHourDirty;
  useUnsavedChangesWarning(hasUnsavedChanges);

  async function handleSaveHero() {
    setHeroLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'homepageHero',
          value: hero,
          description: 'Homepage hero section content',
        }),
      });
      router.refresh();
      setIsHeroDirty(false);
      initialHeroRef.current = hero;
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

  async function handleSaveContact() {
    setContactLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'contact',
          value: contact,
          description: 'Contact information',
        }),
      });
      router.refresh();
      setIsContactDirty(false);
      initialContactRef.current = contact;
      showToast('Contact information saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save contact information', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setContactLoading(false);
    }
  }

  function handleCancelContact() {
    setContact(initialContactRef.current);
    setIsContactDirty(false);
  }

  async function handleSaveHours() {
    setHoursLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'hours',
          value: hours,
          description: 'Business hours by day of week',
        }),
      });
      router.refresh();
      setIsHoursDirty(false);
      initialHoursRef.current = hours;
      showToast('Business hours saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save business hours', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setHoursLoading(false);
    }
  }

  function handleCancelHours() {
    setHours(initialHoursRef.current);
    setIsHoursDirty(false);
  }

  async function handleSaveMap() {
    setMapLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'mapEmbed',
          value: mapEmbed,
          description: 'Google Maps embed URL',
        }),
      });
      router.refresh();
      setIsMapDirty(false);
      initialMapEmbedRef.current = mapEmbed;
      showToast('Google Maps saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save Google Maps', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMapLoading(false);
    }
  }

  function handleCancelMap() {
    setMapEmbed(initialMapEmbedRef.current);
    setIsMapDirty(false);
  }

  async function handleSaveHappyHour() {
    setHappyHourLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'happyHour',
          value: happyHour,
          description: 'Happy Hour information',
        }),
      });
      router.refresh();
      setIsHappyHourDirty(false);
      initialHappyHourRef.current = happyHour;
      showToast('Happy Hour saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save Happy Hour', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setHappyHourLoading(false);
    }
  }

  function handleCancelHappyHour() {
    setHappyHour(initialHappyHourRef.current);
    setIsHappyHourDirty(false);
  }

  function updateHours(day: string, field: 'open' | 'close', value: string) {
    setHours({
      ...hours,
      [day]: {
        ...hours[day as keyof typeof hours],
        [field]: value,
      },
    });
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  const [activeTab, setActiveTab] = useState('hero');

  const tabs = [
    { id: 'hero', label: 'Hero', dirty: isHeroDirty },
    { id: 'about', label: 'About', dirty: isAboutDirty },
    { id: 'gallery', label: 'Gallery', dirty: isGalleryDirty },
    { id: 'contact', label: 'Contact', dirty: isContactDirty },
    { id: 'hours', label: 'Hours', dirty: isHoursDirty },
    { id: 'happyHour', label: 'Happy Hour', dirty: isHappyHourDirty },
    { id: 'map', label: 'Map', dirty: isMapDirty },
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
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="/pics/hero.png"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Default: /pics/hero.png (leave empty to use dynamic images based on events/specials)
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
            </div>
          )}

          {/* Contact Information */}
          {activeTab === 'contact' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Contact Information</h2>
                <div className="flex gap-1.5">
                  {isContactDirty && (
                    <button
                      type="button"
                      onClick={handleCancelContact}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    disabled={contactLoading || !isContactDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {contactLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label htmlFor="address" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Street Address</label>
                  <input
                    id="address"
                    type="text"
                    value={contact.address}
                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">City</label>
                  <input
                    id="city"
                    type="text"
                    value={contact.city}
                    onChange={(e) => setContact({ ...contact, city: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">State</label>
                  <input
                    id="state"
                    type="text"
                    value={contact.state}
                    onChange={(e) => setContact({ ...contact, state: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="zip" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">ZIP</label>
                  <input
                    id="zip"
                    type="text"
                    value={contact.zip}
                    onChange={(e) => setContact({ ...contact, zip: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Business Hours */}
          {activeTab === 'hours' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Business Hours</h2>
                <div className="flex gap-1.5">
                  {isHoursDirty && (
                    <button
                      type="button"
                      onClick={handleCancelHours}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHours}
                    disabled={hoursLoading || !isHoursDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {hoursLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {days.map((day) => (
                  <div key={day.key} className="grid grid-cols-3 gap-3 items-start">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">{day.label.slice(0, 3)}</label>
                    <TimePicker
                      value={hours[day.key as keyof typeof hours].open}
                      onChange={(value) => updateHours(day.key, 'open', value)}
                    />
                    <TimePicker
                      value={hours[day.key as keyof typeof hours].close}
                      onChange={(value) => updateHours(day.key, 'close', value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Happy Hour */}
          {activeTab === 'happyHour' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Happy Hour</h2>
                <div className="flex gap-1.5">
                  {isHappyHourDirty && (
                    <button
                      type="button"
                      onClick={handleCancelHappyHour}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHappyHour}
                    disabled={happyHourLoading || !isHappyHourDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {happyHourLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={happyHour.enabled}
                    onChange={(e) => setHappyHour({ ...happyHour, enabled: e.target.checked })}
                    className="w-4 h-4 cursor-pointer text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Enable Happy Hour display</span>
                </label>
                <div>
                  <label htmlFor="hhTitle" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Title</label>
                  <input
                    id="hhTitle"
                    type="text"
                    value={happyHour.title}
                    onChange={(e) => setHappyHour({ ...happyHour, title: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="hhDescription" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Description</label>
                  <input
                    id="hhDescription"
                    type="text"
                    value={happyHour.description}
                    onChange={(e) => setHappyHour({ ...happyHour, description: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="hhTimes" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Times</label>
                  <input
                    id="hhTimes"
                    type="text"
                    value={happyHour.times}
                    onChange={(e) => setHappyHour({ ...happyHour, times: e.target.value })}
                    placeholder="e.g., 10am-12pm & 4pm-7pm"
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="hhDetails" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Details (optional)</label>
                  <input
                    id="hhDetails"
                    type="text"
                    value={happyHour.details}
                    onChange={(e) => setHappyHour({ ...happyHour, details: e.target.value })}
                    placeholder="e.g., On your first round"
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Map Embed */}
          {activeTab === 'map' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Google Maps</h2>
                <div className="flex gap-1.5">
                  {isMapDirty && (
                    <button
                      type="button"
                      onClick={handleCancelMap}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveMap}
                    disabled={mapLoading || !isMapDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {mapLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label htmlFor="mapUrl" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Embed URL</label>
                  <input
                    id="mapUrl"
                    type="url"
                    value={mapEmbed.url}
                    onChange={(e) => setMapEmbed({ ...mapEmbed, url: e.target.value })}
                    placeholder="https://google.com/maps/embed?pb=..."
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Share → Embed → Copy iframe src
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mapEmbed.enabled}
                    onChange={(e) => setMapEmbed({ ...mapEmbed, enabled: e.target.checked })}
                    className="w-4 h-4 cursor-pointer text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Show map on contact page</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

