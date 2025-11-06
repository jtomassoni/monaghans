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

  let contact: any = {};
  let social: any = {};
  let hours: any = {};
  try {
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    social = socialSetting ? JSON.parse(socialSetting.value) : {};
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
  } catch {}

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

  return (
    <footer id="contact" className="bg-black border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
          {/* Left Column - About & Social */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-white">Monaghan&apos;s</h3>
            <p className="text-gray-300 text-base mb-6 leading-relaxed">
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

          {/* Right Column - Contact & Hours */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-white">Visit Us</h3>
            {contact.address && (
              <div className="text-gray-300 mb-4">
                <p className="font-medium">{contact.address}</p>
                {contact.city && contact.state && (
                  <p className="text-gray-400">
                    {contact.city}, {contact.state} {contact.zip}
                  </p>
                )}
              </div>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\D/g, '')}`}
                className="text-gray-300 hover:text-[var(--color-accent)] transition text-lg font-medium block mb-4 cursor-pointer"
              >
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-gray-400 hover:text-[var(--color-accent)] transition text-sm block mb-4 cursor-pointer"
              >
                {contact.email}
              </a>
            )}
            {todayHours && todayHours.open && todayHours.close && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-500 mb-2">Today&apos;s Hours</p>
                <p className="text-gray-300 font-medium">
                  {formatTime(todayHours.open)} - {formatTime(todayHours.close)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Monaghan&apos;s Bar and Grill. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-6 text-sm items-center">
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


