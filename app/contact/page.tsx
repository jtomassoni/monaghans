import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function ContactPage() {
  const contactSetting = await prisma.setting.findUnique({
    where: { key: 'contact' },
  });
  const hoursSetting = await prisma.setting.findUnique({
    where: { key: 'hours' },
  });
  const mapSetting = await prisma.setting.findUnique({
    where: { key: 'mapEmbed' },
  });

  let contact: any = {};
  let hours: any = {};
  let mapEmbed: any = {};
  
  try {
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
    mapEmbed = mapSetting ? JSON.parse(mapSetting.value) : {};
  } catch {}

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hourStr, minutes] = time.split(':');
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatHours = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (!hours || Object.keys(hours).length === 0) {
      return null;
    }

    return dayNames.map((dayName, idx) => {
      const dayKey = days[idx];
      const dayHours = hours[dayKey];
      if (!dayHours || !dayHours.open || !dayHours.close) return null;
      return (
        <div key={dayName} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
          <span className="text-gray-300 font-medium">{dayName}</span>
          <span className="text-gray-400">
            {formatTime(dayHours.open)} - {formatTime(dayHours.close)}
          </span>
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">Contact Us</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Stop by, give us a call, or drop us a line. We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Contact Info */}
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Get in Touch
            </h2>
            <div className="space-y-6">
              {contact.address && (
                <div>
                  <p className="text-sm font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-2">Address</p>
                  <p className="text-gray-300 text-lg">{contact.address}</p>
                  {contact.city && contact.state && (
                    <p className="text-gray-400 mt-1">
                      {contact.city}, {contact.state} {contact.zip}
                    </p>
                  )}
                </div>
              )}
              {contact.phone && (
                <div>
                  <p className="text-sm font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-2">Phone</p>
                  <a
                    href={`tel:${contact.phone.replace(/\D/g, '')}`}
                    className="text-white text-xl hover:text-[var(--color-accent)] transition font-medium"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.email && (
                <div>
                  <p className="text-sm font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-2">Email</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-white hover:text-[var(--color-accent)] transition"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Hours */}
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hours
            </h2>
            {formatHours() ? (
              <div className="space-y-0">{formatHours()}</div>
            ) : (
              <p className="text-gray-400">Hours coming soon</p>
            )}
          </div>
        </div>

        {/* Map */}
        {mapEmbed.enabled && mapEmbed.url && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">Find Us</h2>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
              <div className="aspect-video w-full">
                <iframe
                  src={mapEmbed.url}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center flex flex-wrap justify-center gap-4">
          <Link
            href="/private-events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Private Events
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}


