'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import TimePicker from '@/components/time-picker';

interface SettingsFormProps {
  initialTimezone: string;
  initialSiteTitle: string;
  initialContact: any;
  initialHours: any;
  initialMapEmbed: any;
  initialHappyHour: any;
}

// Common timezones for US businesses
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

export default function SettingsForm({ 
  initialTimezone, 
  initialSiteTitle,
  initialContact,
  initialHours,
  initialMapEmbed,
  initialHappyHour,
}: SettingsFormProps) {
  const router = useRouter();
  
  // Initialize state
  const [siteTitleLoading, setSiteTitleLoading] = useState(false);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [happyHourLoading, setHappyHourLoading] = useState(false);

  // Initial data
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
  const initialHappyHourData = {
    enabled: initialHappyHour?.enabled ?? false,
    title: initialHappyHour?.title || 'Buy One Get One',
    description: initialHappyHour?.description || 'BOGO on Wine, Well & Drafts',
    times: initialHappyHour?.times || '10am-12pm & 4pm-7pm',
  };

  // Store initial values in refs
  const initialSiteTitleRef = useRef(initialSiteTitleData);
  const initialTimezoneRef = useRef(initialTimezone);
  const initialContactRef = useRef(initialContactData);
  const initialHoursRef = useRef(initialHoursData);
  const initialMapEmbedRef = useRef(initialMapEmbedData);
  const initialHappyHourRef = useRef(initialHappyHourData);

  // State
  const [siteTitle, setSiteTitle] = useState(initialSiteTitleData);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [contact, setContact] = useState(initialContactData);
  const [hours, setHours] = useState(initialHoursData);
  const [mapEmbed, setMapEmbed] = useState(initialMapEmbedData);
  const [happyHour, setHappyHour] = useState(initialHappyHourData);

  // Validation errors for contact form
  const [contactErrors, setContactErrors] = useState<{ phone?: string; email?: string }>({});

  // Track dirty state
  const [isSiteTitleDirty, setIsSiteTitleDirty] = useState(false);
  const [isTimezoneDirty, setIsTimezoneDirty] = useState(false);
  const [isContactDirty, setIsContactDirty] = useState(false);
  const [isHoursDirty, setIsHoursDirty] = useState(false);
  const [isMapDirty, setIsMapDirty] = useState(false);
  const [isHappyHourDirty, setIsHappyHourDirty] = useState(false);

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
    initialHappyHourRef.current = initialHappyHourData;
    setIsHappyHourDirty(false);
  }, [initialHappyHour?.enabled, initialHappyHour?.title, initialHappyHour?.description, initialHappyHour?.times]);

  // Check if forms are dirty
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
    setIsHappyHourDirty(JSON.stringify(happyHour) !== JSON.stringify(initialHappyHourRef.current));
  }, [happyHour]);

  // Warn user before leaving page with unsaved changes
  const hasUnsavedChanges = isSiteTitleDirty || isTimezoneDirty || isContactDirty || isHoursDirty || isMapDirty || isHappyHourDirty;
  useUnsavedChangesWarning(hasUnsavedChanges);

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
    // Validate before saving
    const phoneError = validatePhone(contact.phone);
    const emailError = validateEmail(contact.email);
    
    if (phoneError || emailError) {
      setContactErrors({
        phone: phoneError,
        email: emailError,
      });
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

  // Validation functions for contact form
  const validatePhone = (phone: string): string | undefined => {
    if (!phone || phone.trim() === '') return undefined; // Optional field
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
    if (!email || email.trim() === '') return undefined; // Optional field
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

  // Helper function to extract URL from iframe HTML or return the URL as-is
  const extractMapUrl = (input: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      return iframeMatch[1];
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return trimmed;
  };

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  const [activeTab, setActiveTab] = useState('siteTitle');

  const tabs = [
    { id: 'siteTitle', label: 'Site Title', dirty: isSiteTitleDirty },
    { id: 'timezone', label: 'Timezone', dirty: isTimezoneDirty },
    { id: 'contact', label: 'Contact', dirty: isContactDirty },
    { id: 'hours', label: 'Hours', dirty: isHoursDirty },
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
          {/* Site Title Section */}
          {activeTab === 'siteTitle' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Site Title</h2>
                <div className="flex gap-1.5">
                  {isSiteTitleDirty && (
                    <button
                      type="button"
                      onClick={handleCancelSiteTitle}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveSiteTitle}
                    disabled={siteTitleLoading || !isSiteTitleDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {siteTitleLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label htmlFor="siteTitle" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Website Title</label>
                  <input
                    id="siteTitle"
                    type="text"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    maxLength={100}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Monaghan's Dive Bar"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This title appears in browser tabs and when sharing links on social media or SMS.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timezone Section */}
          {activeTab === 'timezone' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Company Timezone</h2>
                <div className="flex gap-1.5">
                  {isTimezoneDirty && (
                    <button
                      type="button"
                      onClick={handleCancelTimezone}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveTimezone}
                    disabled={timezoneLoading || !isTimezoneDirty}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {timezoneLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label htmlFor="timezone" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Timezone</label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Set the timezone for your business location. This affects how dates and times are displayed throughout the system.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Section */}
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
                    className={`w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 ${
                      contactErrors.phone
                        ? 'border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400'
                    }`}
                  />
                  {contactErrors.phone && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{contactErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Email</label>
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
                    className={`w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 ${
                      contactErrors.email
                        ? 'border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400'
                    }`}
                  />
                  {contactErrors.email && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{contactErrors.email}</p>
                  )}
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

          {/* Map Section */}
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mapEmbed.enabled}
                    onChange={(e) => setMapEmbed({ ...mapEmbed, enabled: e.target.checked })}
                    className="w-4 h-4 cursor-pointer text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Enable map display</span>
                </label>
                <div>
                  <label htmlFor="mapUrl" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Map Embed URL or Iframe</label>
                  <textarea
                    id="mapUrl"
                    value={mapEmbed.url}
                    onChange={(e) => setMapEmbed({ ...mapEmbed, url: e.target.value })}
                    rows={4}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-y min-h-[80px]"
                    placeholder="Paste Google Maps embed URL or iframe HTML here"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Paste the embed URL from Google Maps or the full iframe HTML code.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
