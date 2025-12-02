import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function Footer() {
  const contactSetting = await prisma.setting.findUnique({
    where: { key: 'contact' },
  });
  
  const socialSetting = await prisma.setting.findUnique({
    where: { key: 'social' },
  });

  const hoursSetting = await prisma.setting.findUnique({
    where: { key: 'hours' },
  });

  const happyHourSetting = await prisma.setting.findUnique({
    where: { key: 'happyHour' },
  });

  const mapSetting = await prisma.setting.findUnique({
    where: { key: 'mapEmbed' },
  });

  let contact: any = {};
  let social: any = {};
  let hours: any = {};
  let happyHour: any = {};
  let mapEmbed: any = {};
  try {
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    social = socialSetting ? JSON.parse(socialSetting.value) : {};
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
    happyHour = happyHourSetting ? JSON.parse(happyHourSetting.value) : {};
    mapEmbed = mapSetting ? JSON.parse(mapSetting.value) : {};
  } catch {}

  const hasHappyHour = happyHour && (happyHour.title || happyHour.description || happyHour.times);

  // Get today's hours for display
  const today = new Date();
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayDay = days[today.getDay() === 0 ? 6 : today.getDay() - 1];
  const todayHours = hours[todayDay];

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hourStr, minutes] = time.split(':');
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Validate and prepare map URL
  const getMapUrl = () => {
    if (!mapEmbed.enabled || !mapEmbed.url) return null;
    
    let url = mapEmbed.url.trim();
    
    // Remove any iframe tags if the full HTML was pasted
    const iframeMatch = url.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      url = iframeMatch[1];
    }
    
    // Decode HTML entities that might appear in URLs from Google Maps embed code
    // Helper function to decode numeric entities (like &#39;)
    const decodeNumericEntity = (_match: string, code: string): string => {
      return String.fromCharCode(parseInt(code, 10));
    };
    
    // Helper function to decode hex entities (like &#x27;)
    const decodeHexEntity = (_match: string, code: string): string => {
      return String.fromCharCode(parseInt(code, 16));
    };
    
    // First decode numeric entities
    url = url.replace(/&#(\d+);/g, decodeNumericEntity);
    
    // Then decode hex entities
    url = url.replace(/&#x([0-9a-fA-F]+);/g, decodeHexEntity);
    
    // Finally decode named entities (but be careful with &amp;)
    url = url
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');  // Must be last to avoid double-replacement
    
    // Ensure it's an absolute URL starting with http:// or https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // If it doesn't start with http, it might be malformed
      return null;
    }
    
    // Check if it's a valid Google Maps embed URL
    // Embed URLs typically contain 'google.com/maps/embed' or 'maps.google.com/maps/embed'
    if (url.includes('google.com/maps/embed') || url.includes('maps.google.com/maps/embed')) {
      // Validate it's actually a Google Maps URL (not a relative path or our own domain)
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('google.com') || urlObj.hostname.includes('googleapis.com')) {
          return url;
        }
      } catch (e) {
        // Invalid URL format
        return null;
      }
    }
    
    // If it's a share link or other format, return null to use fallback
    // User needs to use the "Embed a map" option from Google Maps, not the share link
    return null;
  };

  const mapUrl = getMapUrl();
  const hasValidMap = mapUrl !== null;
  const hasAddress = contact.address && contact.city && contact.state;
  const showMap = hasValidMap || hasAddress;

  // Generate Google Maps search URL for fallback
  const getGoogleMapsSearchUrl = () => {
    if (!hasAddress) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${contact.address}, ${contact.city}, ${contact.state} ${contact.zip || ''}`
    )}`;
  };

  return (
    <footer id="contact" className="bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className={`grid grid-cols-1 ${showMap ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8 lg:gap-12 mb-10`}>
          {/* Left Column - About & Social */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-white">Monaghan&apos;s</h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Monaghan&apos;s has been serving the Sheridan neighborhood since 1892. A woman-owned bar purchased after over a decade of dedicated service, we&apos;re proud to carry on the tradition of great food, cold drinks, and warm community.
            </p>
            <div className="flex gap-4">
              {social.facebook ? (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition transform hover:scale-110 cursor-pointer"
                  aria-label="Facebook"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              ) : (
                <div className="w-12 h-12 bg-blue-600/50 rounded-full flex items-center justify-center cursor-not-allowed opacity-50" aria-label="Facebook">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
              )}
              {social.instagram ? (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full flex items-center justify-center transition transform hover:scale-110 cursor-pointer"
                  aria-label="Instagram"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500/50 to-pink-500/50 rounded-full flex items-center justify-center cursor-not-allowed opacity-50" aria-label="Instagram">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Contact & Hours */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-white">Contact & Hours</h3>
            
            {/* Contact Information */}
            <div className="space-y-3 mb-6">
              {contact.address && (
                <div className="text-gray-300">
                  <p className="font-medium">{contact.address}</p>
                  {contact.city && contact.state && (
                    <p className="text-gray-400 text-sm">
                      {contact.city}, {contact.state} {contact.zip}
                    </p>
                  )}
                </div>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\D/g, '')}`}
                  className="text-gray-300 hover:text-[var(--color-accent)] transition text-base font-medium block cursor-pointer"
                >
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="text-gray-400 hover:text-[var(--color-accent)] transition text-sm block cursor-pointer"
                >
                  {contact.email}
                </a>
              )}
            </div>

            {/* Hours */}
            {todayHours && todayHours.open && todayHours.close && (
              <div className="mb-4 pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Today&apos;s Hours</p>
                </div>
                <p className="text-gray-300 font-medium">
                  {formatTime(todayHours.open)} - {formatTime(todayHours.close)}
                </p>
              </div>
            )}

            {/* Happy Hour */}
            {hasHappyHour && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Happy Hour</p>
                </div>
                {happyHour.title && (
                  <p className="text-gray-300 font-semibold mb-1 text-sm">
                    {happyHour.title}
                  </p>
                )}
                {happyHour.description && (
                  <p className="text-gray-400 text-xs mb-1">
                    {happyHour.description}
                  </p>
                )}
                {happyHour.details && (
                  <p className="text-gray-400 text-xs mb-1">
                    {happyHour.details}
                  </p>
                )}
                {happyHour.times && (
                  <p className="text-gray-300 text-xs font-medium">
                    {happyHour.times}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Location Map */}
          {showMap && (
            <div>
              <h3 className="text-2xl font-bold mb-4 text-white">Our Location</h3>
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
                {hasValidMap && mapUrl ? (
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full"
                    title="Monaghan's Bar and Grill Location"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  />
                ) : (
                  <a
                    href={getGoogleMapsSearchUrl() || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center hover:bg-gray-800 transition group cursor-pointer"
                  >
                    <div className="text-center p-4">
                      <svg className="w-16 h-16 text-gray-600 group-hover:text-[var(--color-accent)] transition mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-gray-400 text-sm group-hover:text-[var(--color-accent)] transition font-medium">
                        View on Google Maps
                      </p>
                      {!hasValidMap && mapEmbed.enabled && mapEmbed.url && (
                        <p className="text-gray-500 text-xs mt-2 max-w-xs mx-auto">
                          Please use the embed URL from Google Maps (not the share link). Click &quot;Share&quot; → &quot;Embed a map&quot; to get the correct URL.
                        </p>
                      )}
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Monaghan&apos;s Bar and Grill. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-6 text-sm items-center">
              <Link
                href="/menu"
                className="text-gray-500 hover:text-[var(--color-accent)] transition cursor-pointer"
              >
                Menu
              </Link>
              <Link
                href="/events"
                className="text-gray-500 hover:text-[var(--color-accent)] transition cursor-pointer"
              >
                Events
              </Link>
              <Link
                href="/private-events"
                className="text-gray-500 hover:text-[var(--color-accent)] transition cursor-pointer"
              >
                Private Events
              </Link>
              <Link
                href="/contact"
                className="text-gray-500 hover:text-[var(--color-accent)] transition cursor-pointer"
              >
                Contact
              </Link>
              {social.facebook ? (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-400 transition cursor-pointer"
                >
                  Facebook
                </a>
              ) : (
                <span className="text-gray-600 opacity-50 cursor-not-allowed">Facebook</span>
              )}
              {social.instagram ? (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-pink-400 transition cursor-pointer"
                >
                  Instagram
                </a>
              ) : (
                <span className="text-gray-600 opacity-50 cursor-not-allowed">Instagram</span>
              )}
              <Link
                href="/admin/login"
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md transition text-xs font-medium cursor-pointer"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


