'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';

interface SettingsFormProps {
  initialContact: any;
  initialHours: any;
  initialMapEmbed: any;
  initialHappyHour: any;
  initialSocial: any;
  initialOrderManagement: any;
}

export default function SettingsForm({ initialContact, initialHours, initialMapEmbed, initialHappyHour, initialSocial, initialOrderManagement }: SettingsFormProps) {
  const router = useRouter();
  const [contactLoading, setContactLoading] = useState(false);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [happyHourLoading, setHappyHourLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  
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

  const initialSocialData = {
    facebook: initialSocial?.facebook || '',
    instagram: initialSocial?.instagram || '',
  };

  const initialOrderManagementData = {
    mode: initialOrderManagement?.mode || 'foh', // 'foh' or 'boh'
  };

  // Store initial values in refs to compare against
  const initialContactRef = useRef(initialContactData);
  const initialHoursRef = useRef(initialHoursData);
  const initialMapEmbedRef = useRef(initialMapEmbedData);
  const initialHappyHourRef = useRef(initialHappyHourData);
  const initialSocialRef = useRef(initialSocialData);
  const initialOrderManagementRef = useRef(initialOrderManagementData);
  
  // Update refs when props change (after save)
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

  useEffect(() => {
    initialSocialRef.current = initialSocialData;
    setIsSocialDirty(false);
  }, [initialSocial?.facebook, initialSocial?.instagram]);

  useEffect(() => {
    initialOrderManagementRef.current = initialOrderManagementData;
    setIsOrderManagementDirty(false);
  }, [initialOrderManagement?.mode]);
  
  const [contact, setContact] = useState(initialContactData);
  const [hours, setHours] = useState(initialHoursData);
  const [mapEmbed, setMapEmbed] = useState(initialMapEmbedData);
  const [happyHour, setHappyHour] = useState(initialHappyHourData);
  const [social, setSocial] = useState(initialSocialData);
  const [orderManagement, setOrderManagement] = useState(initialOrderManagementData);

  // Track dirty state
  const [isContactDirty, setIsContactDirty] = useState(false);
  const [isHoursDirty, setIsHoursDirty] = useState(false);
  const [isSocialDirty, setIsSocialDirty] = useState(false);
  const [isHappyHourDirty, setIsHappyHourDirty] = useState(false);
  const [isMapDirty, setIsMapDirty] = useState(false);
  const [isOrderManagementDirty, setIsOrderManagementDirty] = useState(false);
  const [orderManagementLoading, setOrderManagementLoading] = useState(false);

  // Check if forms are dirty
  useEffect(() => {
    setIsContactDirty(JSON.stringify(contact) !== JSON.stringify(initialContactRef.current));
  }, [contact]);

  useEffect(() => {
    setIsHoursDirty(JSON.stringify(hours) !== JSON.stringify(initialHoursRef.current));
  }, [hours]);

  useEffect(() => {
    setIsSocialDirty(JSON.stringify(social) !== JSON.stringify(initialSocialRef.current));
  }, [social]);

  useEffect(() => {
    setIsHappyHourDirty(JSON.stringify(happyHour) !== JSON.stringify(initialHappyHourRef.current));
  }, [happyHour]);

  useEffect(() => {
    setIsMapDirty(JSON.stringify(mapEmbed) !== JSON.stringify(initialMapEmbedRef.current));
  }, [mapEmbed]);

  useEffect(() => {
    setIsOrderManagementDirty(JSON.stringify(orderManagement) !== JSON.stringify(initialOrderManagementRef.current));
  }, [orderManagement]);

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

  async function handleSaveSocial() {
    setSocialLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'social',
          value: social,
          description: 'Social media links',
        }),
      });
      router.refresh();
      setIsSocialDirty(false);
      initialSocialRef.current = social;
      showToast('Social media saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save social media', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSocialLoading(false);
    }
  }

  function handleCancelSocial() {
    setSocial(initialSocialRef.current);
    setIsSocialDirty(false);
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

  async function handleSaveOrderManagement() {
    setOrderManagementLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'orderManagement',
          value: orderManagement,
          description: 'Order management mode configuration',
        }),
      });
      router.refresh();
      setIsOrderManagementDirty(false);
      initialOrderManagementRef.current = orderManagement;
      showToast('Order management settings saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save order management settings', 'error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setOrderManagementLoading(false);
    }
  }

  function handleCancelOrderManagement() {
    setOrderManagement(initialOrderManagementRef.current);
    setIsOrderManagementDirty(false);
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Contact & Social Media */}
        <div className="space-y-4">
          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h2>
                <div className="flex gap-2">
                  {isContactDirty && (
                    <button
                      type="button"
                      onClick={handleCancelContact}
                      className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    disabled={contactLoading || !isContactDirty}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {contactLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="address" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Street Address</label>
                  <input
                    id="address"
                    type="text"
                    value={contact.address}
                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">City</label>
                  <input
                    id="city"
                    type="text"
                    value={contact.city}
                    onChange={(e) => setContact({ ...contact, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">State</label>
                  <input
                    id="state"
                    type="text"
                    value={contact.state}
                    onChange={(e) => setContact({ ...contact, state: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="zip" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">ZIP</label>
                  <input
                    id="zip"
                    type="text"
                    value={contact.zip}
                    onChange={(e) => setContact({ ...contact, zip: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Administration Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Administration</h2>
                <div className="flex gap-2">
                  {isOrderManagementDirty && (
                    <button
                      type="button"
                      onClick={handleCancelOrderManagement}
                      className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveOrderManagement}
                    disabled={orderManagementLoading || !isOrderManagementDirty}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {orderManagementLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Order Management Mode</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Choose how online orders are managed. This affects which department handles order acknowledgment and tip distribution.
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      style={{
                        borderColor: orderManagement.mode === 'foh' ? 'rgb(37 99 235)' : 'rgb(209 213 219)',
                        backgroundColor: orderManagement.mode === 'foh' ? 'rgb(239 246 255)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="orderMode"
                        value="foh"
                        checked={orderManagement.mode === 'foh'}
                        onChange={(e) => setOrderManagement({ ...orderManagement, mode: e.target.value })}
                        className="mt-1 w-4 h-4 cursor-pointer text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">Front of House (FOH) Mode</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          FOH staff acknowledge orders on a tablet/laptop. FOH handles order confirmation and customer interaction. 
                          BOH receives orders after confirmation and handles preparation.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      style={{
                        borderColor: orderManagement.mode === 'boh' ? 'rgb(37 99 235)' : 'rgb(209 213 219)',
                        backgroundColor: orderManagement.mode === 'boh' ? 'rgb(239 246 255)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="orderMode"
                        value="boh"
                        checked={orderManagement.mode === 'boh'}
                        onChange={(e) => setOrderManagement({ ...orderManagement, mode: e.target.value })}
                        className="mt-1 w-4 h-4 cursor-pointer text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">Back of House (BOH) Mode</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          BOH manages online orders end-to-end. They handle everything except giving the order to the customer or delivery driver.
                        </div>
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                          💰 Tip Distribution: BOH receives 70% of tips, FOH receives 30%
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Hours & Happy Hour */}
        <div className="space-y-4">
          {/* Hours */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Business Hours</h2>
                <div className="flex gap-2">
                  {isHoursDirty && (
                    <button
                      type="button"
                      onClick={handleCancelHours}
                      className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHours}
                    disabled={hoursLoading || !isHoursDirty}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {hoursLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {days.map((day) => (
                  <div key={day.key} className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{day.label.slice(0, 3)}</label>
                    <input
                      type="time"
                      value={hours[day.key as keyof typeof hours].open}
                      onChange={(e) => updateHours(day.key, 'open', e.target.value)}
                      className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    <input
                      type="time"
                      value={hours[day.key as keyof typeof hours].close}
                      onChange={(e) => updateHours(day.key, 'close', e.target.value)}
                      className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Happy Hour */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Happy Hour</h2>
                <div className="flex gap-2">
                  {isHappyHourDirty && (
                    <button
                      type="button"
                      onClick={handleCancelHappyHour}
                      className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHappyHour}
                    disabled={happyHourLoading || !isHappyHourDirty}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                  >
                    {happyHourLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
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
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label htmlFor="hhDescription" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Description</label>
              <input
                id="hhDescription"
                type="text"
                value={happyHour.description}
                onChange={(e) => setHappyHour({ ...happyHour, description: e.target.value })}
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing & Display Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Social Media */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Social Media</h2>
              <div className="flex gap-2">
                {isSocialDirty && (
                  <button
                    type="button"
                    onClick={handleCancelSocial}
                    className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveSocial}
                  disabled={socialLoading || !isSocialDirty}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                >
                  {socialLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="facebook" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Facebook URL</label>
                <input
                  id="facebook"
                  type="url"
                  value={social.facebook}
                  onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
              <div>
                <label htmlFor="instagram" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Instagram URL</label>
                <input
                  id="instagram"
                  type="url"
                  value={social.instagram}
                  onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
                  placeholder="https://instagram.com/yourpage"
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Map Embed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Google Maps</h2>
              <div className="flex gap-2">
                {isMapDirty && (
                  <button
                    type="button"
                    onClick={handleCancelMap}
                    className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 rounded font-medium cursor-pointer transition text-white text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveMap}
                  disabled={mapLoading || !isMapDirty}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition text-white text-xs"
                >
                  {mapLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="mapUrl" className="block text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">Embed URL</label>
                <input
                  id="mapUrl"
                  type="url"
                  value={mapEmbed.url}
                  onChange={(e) => setMapEmbed({ ...mapEmbed, url: e.target.value })}
                  placeholder="https://google.com/maps/embed?pb=..."
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
        </div>
      </div>
      </div>
    </div>
  );
}


