'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import TimePicker from '@/components/time-picker';

interface CombinedSettingsFormProps {
  initialTimezone: string;
  initialSiteTitle: string;
  initialContact: any;
  initialHours: any;
  initialMapEmbed: any;
  initialHero: any;
  initialAbout: any;
  initialGallery: any;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function CombinedSettingsForm({
  initialTimezone,
  initialSiteTitle,
  initialContact,
  initialHours,
  initialMapEmbed,
  initialHero,
  initialAbout,
  initialGallery,
}: CombinedSettingsFormProps) {
  const router = useRouter();

  // Initialize data
  const initialSiteTitleData = initialSiteTitle || "Monaghan's Dive Bar";
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

  // Refs for initial values
  const initialSiteTitleRef = useRef(initialSiteTitleData);
  const initialTimezoneRef = useRef(initialTimezone);
  const initialContactRef = useRef(initialContactData);
  const initialHoursRef = useRef(initialHoursData);
  const initialMapEmbedRef = useRef(initialMapEmbedData);
  const initialHeroRef = useRef(initialHeroData);
  const initialAboutRef = useRef(initialAboutData);
  const initialGalleryRef = useRef(initialGalleryData);

  // State
  const [siteTitle, setSiteTitle] = useState(initialSiteTitleData);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [contact, setContact] = useState(initialContactData);
  const [hours, setHours] = useState(initialHoursData);
  const [mapEmbed, setMapEmbed] = useState(initialMapEmbedData);
  const [hero, setHero] = useState(initialHeroData);
  const [about, setAbout] = useState(initialAboutData);
  const [gallery, setGallery] = useState(initialGalleryData);

  // Loading states
  const [siteTitleLoading, setSiteTitleLoading] = useState(false);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [heroLoading, setHeroLoading] = useState(false);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Validation errors
  const [contactErrors, setContactErrors] = useState<{ phone?: string; email?: string }>({});

  // Dirty state tracking
  const [isSiteTitleDirty, setIsSiteTitleDirty] = useState(false);
  const [isTimezoneDirty, setIsTimezoneDirty] = useState(false);
  const [isContactDirty, setIsContactDirty] = useState(false);
  const [isHoursDirty, setIsHoursDirty] = useState(false);
  const [isMapDirty, setIsMapDirty] = useState(false);
  const [isHeroDirty, setIsHeroDirty] = useState(false);
  const [isAboutDirty, setIsAboutDirty] = useState(false);
  const [isGalleryDirty, setIsGalleryDirty] = useState(false);

  // Update refs when props change
  useEffect(() => {
    initialSiteTitleRef.current = initialSiteTitleData;
    setIsSiteTitleDirty(false);
  }, [initialSiteTitle]);

  useEffect(() => {
    initialTimezoneRef.current = initialTimezone;
    setIsTimezoneDirty(false);
  }, [initialTimezone]);

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

  // Check dirty state
  useEffect(() => {
    setIsSiteTitleDirty(siteTitle !== initialSiteTitleRef.current);
  }, [siteTitle]);

  useEffect(() => {
    setIsTimezoneDirty(timezone !== initialTimezoneRef.current);
  }, [timezone]);

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
  const hasUnsavedChanges = isSiteTitleDirty || isTimezoneDirty || isContactDirty || isHoursDirty || isMapDirty || isHeroDirty || isAboutDirty || isGalleryDirty;
  useUnsavedChangesWarning(hasUnsavedChanges);

  // Validation functions
  const validatePhone = (phone: string): string | undefined => {
    if (!phone || phone.trim() === '') return undefined;
    const cleaned = phone.replace(/[\s\-\(\)\.\+]/g, '');
    if (!/^\d+$/.test(cleaned)) {
      return 'Phone number can only contain digits and formatting characters';
    }
    if (cleaned.length < 10 || cleaned.length > 11) {
      return 'Please enter a valid phone number (e.g., (303) 789-7208)';
    }
    if (cleaned.length === 11 && cleaned[0] !== '1') {
      return 'Please enter a valid phone number (e.g., (303) 789-7208)';
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email || email.trim() === '') return undefined;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  function updateHours(day: string, field: 'open' | 'close', value: string) {
    setHours({
      ...hours,
      [day]: {
        ...hours[day as keyof typeof hours],
        [field]: value,
      },
    });
  }

  // Save handlers
  async function handleSaveSiteTitle() {
    setSiteTitleLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'siteTitle',
          value: siteTitle,
          description: 'Website title displayed in browser tabs and social media previews',
        }),
      });
      router.refresh();
      setIsSiteTitleDirty(false);
      initialSiteTitleRef.current = siteTitle;
      showToast('Site title saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save site title', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSiteTitleLoading(false);
    }
  }

  function handleCancelSiteTitle() {
    setSiteTitle(initialSiteTitleRef.current);
    setIsSiteTitleDirty(false);
  }

  async function handleSaveTimezone() {
    setTimezoneLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'timezone',
          value: timezone,
          description: 'Company timezone for all date/time operations',
        }),
      });
      router.refresh();
      setIsTimezoneDirty(false);
      initialTimezoneRef.current = timezone;
      showToast('Timezone saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save timezone', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setTimezoneLoading(false);
    }
  }

  function handleCancelTimezone() {
    setTimezone(initialTimezoneRef.current);
    setIsTimezoneDirty(false);
  }

  async function handleSaveContact() {
    const phoneError = validatePhone(contact.phone);
    const emailError = validateEmail(contact.email);
    
    if (phoneError || emailError) {
      setContactErrors({ phone: phoneError, email: emailError });
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

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
      setContactErrors({});
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
    setContactErrors({});
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

  async function handleSaveHero() {
    setHeroLoading(true);
    try {
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

  // Helper component for section cards
  const SectionCard = ({ 
    title, 
    description, 
    isDirty, 
    onSave, 
    onCancel, 
    loading, 
    children 
  }: { 
    title: string; 
    description?: string;
    isDirty: boolean; 
    onSave: () => void; 
    onCancel: () => void; 
    loading: boolean;
    children: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 sm:p-6 backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isDirty && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={loading || !isDirty}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-6">
        {/* Company Settings Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Company Settings</h2>
          
          <SectionCard
            title="Site Title"
            description="Website title displayed in browser tabs and social media previews"
            isDirty={isSiteTitleDirty}
            onSave={handleSaveSiteTitle}
            onCancel={handleCancelSiteTitle}
            loading={siteTitleLoading}
          >
            <div className="space-y-2">
              <label htmlFor="siteTitle" className="block text-sm font-medium text-gray-900 dark:text-white">
                Website Title
              </label>
              <input
                id="siteTitle"
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                maxLength={100}
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="Monaghan's Dive Bar"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Timezone"
            description="Set the timezone for your business location. This affects how dates and times are displayed throughout the system."
            isDirty={isTimezoneDirty}
            onSave={handleSaveTimezone}
            onCancel={handleCancelTimezone}
            loading={timezoneLoading}
          >
            <div className="space-y-2">
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-900 dark:text-white">
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </SectionCard>

          <SectionCard
            title="Contact Information"
            description="Your business contact details displayed on the website"
            isDirty={isContactDirty}
            onSave={handleSaveContact}
            onCancel={handleCancelContact}
            loading={contactLoading}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Street Address
                </label>
                <input
                  id="address"
                  type="text"
                  value={contact.address}
                  onChange={(e) => setContact({ ...contact, address: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-900 dark:text-white">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={contact.city}
                  onChange={(e) => setContact({ ...contact, city: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="state" className="block text-sm font-medium text-gray-900 dark:text-white">
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  value={contact.state}
                  onChange={(e) => setContact({ ...contact, state: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="zip" className="block text-sm font-medium text-gray-900 dark:text-white">
                  ZIP Code
                </label>
                <input
                  id="zip"
                  type="text"
                  value={contact.zip}
                  onChange={(e) => setContact({ ...contact, zip: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => {
                    const newPhone = e.target.value;
                    setContact({ ...contact, phone: newPhone });
                    const error = validatePhone(newPhone);
                    setContactErrors(prev => ({ ...prev, phone: error }));
                  }}
                  onBlur={(e) => {
                    const error = validatePhone(e.target.value);
                    setContactErrors(prev => ({ ...prev, phone: error }));
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 transition-all ${
                    contactErrors.phone
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500/40 focus:border-red-500'
                      : 'border-gray-200/70 dark:border-gray-700/60 focus:ring-blue-500/40 focus:border-blue-500'
                  }`}
                />
                {contactErrors.phone && (
                  <p className="text-xs text-red-600 dark:text-red-400">{contactErrors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setContact({ ...contact, email: newEmail });
                    const error = validateEmail(newEmail);
                    setContactErrors(prev => ({ ...prev, email: error }));
                  }}
                  onBlur={(e) => {
                    const error = validateEmail(e.target.value);
                    setContactErrors(prev => ({ ...prev, email: error }));
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 transition-all ${
                    contactErrors.email
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500/40 focus:border-red-500'
                      : 'border-gray-200/70 dark:border-gray-700/60 focus:ring-blue-500/40 focus:border-blue-500'
                  }`}
                />
                {contactErrors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400">{contactErrors.email}</p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Business Hours"
            description="Set your operating hours for each day of the week"
            isDirty={isHoursDirty}
            onSave={handleSaveHours}
            onCancel={handleCancelHours}
            loading={hoursLoading}
          >
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day.key} className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">{day.label}</label>
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
          </SectionCard>

          <SectionCard
            title="Google Maps"
            description="Embed a Google Map on your contact page"
            isDirty={isMapDirty}
            onSave={handleSaveMap}
            onCancel={handleCancelMap}
            loading={mapLoading}
          >
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapEmbed.enabled}
                  onChange={(e) => setMapEmbed({ ...mapEmbed, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Enable map display</span>
              </label>
              <div className="space-y-2">
                <label htmlFor="mapUrl" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Map Embed URL or Iframe
                </label>
                <textarea
                  id="mapUrl"
                  value={mapEmbed.url}
                  onChange={(e) => setMapEmbed({ ...mapEmbed, url: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-y"
                  placeholder="Paste Google Maps embed URL or iframe HTML here"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Homepage Content Section */}
        <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Homepage Content</h2>

          <SectionCard
            title="Hero Section"
            description="Main banner content displayed at the top of your homepage"
            isDirty={isHeroDirty}
            onSave={handleSaveHero}
            onCancel={handleCancelHero}
            loading={heroLoading}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="heroTitle" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Main Title
                </label>
                <input
                  id="heroTitle"
                  type="text"
                  value={hero.title}
                  onChange={(e) => setHero({ ...hero, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="Monaghan's"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="heroTagline" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Tagline
                </label>
                <input
                  id="heroTagline"
                  type="text"
                  value={hero.tagline}
                  onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="Bar & Grill"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Subtitle
                </label>
                <input
                  id="heroSubtitle"
                  type="text"
                  value={hero.subtitle}
                  onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="Established 1892 • Denver's Second-Oldest Bar • Minority Woman Owned"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="heroImage" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Hero Image Path
                </label>
                <input
                  id="heroImage"
                  type="text"
                  value={hero.image || '/pics/hero.png'}
                  disabled
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-60"
                  placeholder="/pics/hero.png"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Hero image path cannot be modified. Images are automatically selected based on events and specials.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="About Section"
            description="Content for the about section on your homepage"
            isDirty={isAboutDirty}
            onSave={handleSaveAbout}
            onCancel={handleCancelAbout}
            loading={aboutLoading}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="aboutTitle" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Section Title
                </label>
                <input
                  id="aboutTitle"
                  type="text"
                  value={about.title}
                  onChange={(e) => setAbout({ ...about, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="A Neighborhood Institution"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="aboutParagraph1" className="block text-sm font-medium text-gray-900 dark:text-white">
                  First Paragraph
                </label>
                <textarea
                  id="aboutParagraph1"
                  value={about.paragraph1}
                  onChange={(e) => setAbout({ ...about, paragraph1: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-y"
                  placeholder="First paragraph content..."
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="aboutParagraph2Title" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Second Paragraph Title (Bold)
                </label>
                <input
                  id="aboutParagraph2Title"
                  type="text"
                  value={about.paragraph2Title}
                  onChange={(e) => setAbout({ ...about, paragraph2Title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="A Woman-Owned Legacy"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="aboutParagraph2" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Second Paragraph
                </label>
                <textarea
                  id="aboutParagraph2"
                  value={about.paragraph2}
                  onChange={(e) => setAbout({ ...about, paragraph2: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-y"
                  placeholder="Second paragraph content..."
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="aboutParagraph3" className="block text-sm font-medium text-gray-900 dark:text-white">
                  Third Paragraph
                </label>
                <textarea
                  id="aboutParagraph3"
                  value={about.paragraph3}
                  onChange={(e) => setAbout({ ...about, paragraph3: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-y"
                  placeholder="Third paragraph content..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="aboutLinkText" className="block text-sm font-medium text-gray-900 dark:text-white">
                    Link Text
                  </label>
                  <input
                    id="aboutLinkText"
                    type="text"
                    value={about.linkText}
                    onChange={(e) => setAbout({ ...about, linkText: e.target.value })}
                    className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    placeholder="Learn More About Our Story"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="aboutLinkUrl" className="block text-sm font-medium text-gray-900 dark:text-white">
                    Link URL
                  </label>
                  <input
                    id="aboutLinkUrl"
                    type="text"
                    value={about.linkUrl}
                    onChange={(e) => setAbout({ ...about, linkUrl: e.target.value })}
                    className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    placeholder="/about"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Gallery Section"
            description="Gallery section title for your homepage"
            isDirty={isGalleryDirty}
            onSave={handleSaveGallery}
            onCancel={handleCancelGallery}
            loading={galleryLoading}
          >
            <div className="space-y-2">
              <label htmlFor="galleryTitle" className="block text-sm font-medium text-gray-900 dark:text-white">
                Section Title
              </label>
              <input
                id="galleryTitle"
                type="text"
                value={gallery.title}
                onChange={(e) => setGallery({ ...gallery, title: e.target.value })}
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="Inside Monaghan's"
              />
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Image Upload Coming Soon</p>
              <p>For now, please email pictures to jt</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}


