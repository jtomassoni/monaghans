import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import ImageCarousel from '@/components/image-carousel';
import Footer from '@/components/footer';
import { marked } from 'marked';
import { getMountainTimeToday, getMountainTimeTomorrow, getMountainTimeWeekday, getMountainTimeNow } from '@/lib/timezone';
import { startOfDay, endOfDay } from 'date-fns';

// Helper function to parse YYYY-MM-DD date strings as Mountain Time (not UTC)
// This prevents dates from shifting by a day due to timezone conversion
function parseMountainTimeDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Try different UTC hours to find which one gives us MT midnight
  for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
    const candidate = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0));
    const mtCandidate = candidate.toLocaleString('en-US', { 
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const candidateParts = mtCandidate.split(', ');
    const candidateDate = candidateParts[0];
    const candidateTime = candidateParts[1];
    
    const targetDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    
    if (candidateDate === targetDate && candidateTime === '00:00:00') {
      return candidate;
    }
  }
  
  // Fallback: use UTC-7 (MST)
  return new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
}

// Configure marked to allow HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Force dynamic rendering to prevent caching - we need fresh data for today's specials
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Use Mountain Time for all date calculations
  const today = getMountainTimeToday();
  const tomorrowStart = getMountainTimeTomorrow();
  const now = getMountainTimeNow();

  // Fetch today's events (all day, not just tonight)
  const todaysEvents = await prisma.event.findMany({
    where: {
      isActive: true,
      startDateTime: {
        gte: today,
        lt: tomorrowStart,
      },
    },
    orderBy: { startDateTime: 'asc' },
    take: 3,
  });

  // Fetch the next 3 upcoming events (starting from now, regardless of how far in the future)
  const upcomingEvents = await prisma.event.findMany({
    where: {
      isActive: true,
      startDateTime: {
        gte: now, // Start from now (Mountain Time)
      },
    },
    orderBy: { startDateTime: 'asc' },
    take: 3,
  });

  // Fetch published announcements (most recent first)
  const publishedAnnouncements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        AND: [
          {
            OR: [
              { publishAt: null },
              { publishAt: { lte: now } },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: now } },
            ] as any,
          },
        ],
      },
    orderBy: { createdAt: 'desc' },
    take: 1, // Show only the most recent announcement
  });

  const hoursSetting = await prisma.setting.findUnique({
    where: { key: 'hours' },
  });

  const contactSetting = await prisma.setting.findUnique({
    where: { key: 'contact' },
  });

  const happyHourSetting = await prisma.setting.findUnique({
    where: { key: 'happyHour' },
  });

  const heroSetting = await prisma.setting.findUnique({
    where: { key: 'homepageHero' },
  });

  const aboutSetting = await prisma.setting.findUnique({
    where: { key: 'homepageAbout' },
  });

  const gallerySetting = await prisma.setting.findUnique({
    where: { key: 'homepageGallery' },
  });

  // Fetch today's specials using Mountain Time
  const todayName = getMountainTimeWeekday();
  const todayStart = getMountainTimeToday();

  // Get today's food special (date-based or weekly recurring)
  const allFoodSpecials = await prisma.special.findMany({
    where: {
      isActive: true,
      type: 'food',
    },
  });

  let todaysFoodSpecial = null;
  for (const special of allFoodSpecials) {
    // Parse appliesOn if it exists
    let appliesOn: string[] = [];
    try {
      if (special.appliesOn) {
        appliesOn = typeof special.appliesOn === 'string' 
          ? JSON.parse(special.appliesOn) 
          : special.appliesOn;
        if (!Array.isArray(appliesOn)) {
          appliesOn = [];
        }
        // Normalize day names (trim whitespace, ensure proper case)
        appliesOn = appliesOn.map(day => day.trim()).filter(day => day.length > 0);
      }
    } catch {
      // Invalid JSON, skip
      appliesOn = [];
    }

    // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (special.startDate) {
      const startDateValue = special.startDate as string | Date;
      startDateStr = typeof startDateValue === 'string' 
        ? startDateValue.split('T')[0] 
        : startDateValue.toISOString().split('T')[0];
    }
    
    if (special.endDate) {
      const endDateValue = special.endDate as string | Date;
      endDateStr = typeof endDateValue === 'string' 
        ? endDateValue.split('T')[0] 
        : endDateValue.toISOString().split('T')[0];
    }
    
    const startDate = startDateStr ? parseMountainTimeDate(startDateStr) : null;
    const endDate = endDateStr ? parseMountainTimeDate(endDateStr) : null;

    // If weekly recurring days are set
    if (appliesOn.length > 0) {
      // Check if today matches a recurring day (case-insensitive comparison)
      const matchesDay = appliesOn.some(day => 
        day.toLowerCase() === todayName.toLowerCase()
      );
      
      if (matchesDay) {
        // Weekly recurring specials: prioritize day match over date ranges
        // Only check startDate to see if special has started yet
        // Ignore endDate for weekly recurring patterns (they recur indefinitely)
        if (startDate) {
          const start = startOfDay(startDate);
          
          // Only check if we're past the start date
          if (todayStart >= start) {
            todaysFoodSpecial = special;
            break;
          }
          // If not started yet, skip this special
        } else {
          // No start date restriction, show based on day match
          todaysFoodSpecial = special;
          break;
        }
      }
    } else if (startDate) {
      // Date-based special (no weekly recurring)
      // Only show specials that have both startDate and endDate set
      if (endDate) {
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);
        
        if (todayStart >= start && todayStart <= end) {
          todaysFoodSpecial = special;
          break;
        }
      }
    }
  }

  // Get today's drink special (weekly recurring or date-based)
  const allDrinkSpecials = await prisma.special.findMany({
    where: {
      isActive: true,
      type: 'drink',
    },
  });

  let todaysDrinkSpecial = null;
  for (const special of allDrinkSpecials) {
    // Parse appliesOn if it exists
    let appliesOn: string[] = [];
    try {
      if (special.appliesOn) {
        appliesOn = typeof special.appliesOn === 'string' 
          ? JSON.parse(special.appliesOn) 
          : special.appliesOn;
        if (!Array.isArray(appliesOn)) {
          appliesOn = [];
        }
        // Normalize day names (trim whitespace, ensure proper case)
        appliesOn = appliesOn.map(day => day.trim()).filter(day => day.length > 0);
      }
    } catch {
      // Invalid JSON, skip
      appliesOn = [];
    }

    // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (special.startDate) {
      const startDateValue = special.startDate as string | Date;
      startDateStr = typeof startDateValue === 'string' 
        ? startDateValue.split('T')[0] 
        : startDateValue.toISOString().split('T')[0];
    }
    
    if (special.endDate) {
      const endDateValue = special.endDate as string | Date;
      endDateStr = typeof endDateValue === 'string' 
        ? endDateValue.split('T')[0] 
        : endDateValue.toISOString().split('T')[0];
    }
    
    const startDate = startDateStr ? parseMountainTimeDate(startDateStr) : null;
    const endDate = endDateStr ? parseMountainTimeDate(endDateStr) : null;

    // If weekly recurring days are set
    if (appliesOn.length > 0) {
      // Check if today matches a recurring day (case-insensitive comparison)
      const matchesDay = appliesOn.some(day => 
        day.toLowerCase() === todayName.toLowerCase()
      );
      
      if (matchesDay) {
        // Weekly recurring specials: prioritize day match over date ranges
        // Only check startDate to see if special has started yet
        // Ignore endDate for weekly recurring patterns (they recur indefinitely)
        if (startDate) {
          const start = startOfDay(startDate);
          
          // Only check if we're past the start date
          if (todayStart >= start) {
            todaysDrinkSpecial = special;
            break;
          }
          // If not started yet, skip this special
        } else {
          // No start date restriction, show based on day match
          todaysDrinkSpecial = special;
          break;
        }
      }
    } else if (startDate) {
      // Date-based special (no weekly recurring)
      const start = startOfDay(startDate);
      const end = endDate ? endOfDay(endDate) : start;
      
      if (todayStart >= start && todayStart <= end) {
        todaysDrinkSpecial = special;
        break;
      }
    }
  }

  let hours: any = {};
  let contact: any = {};
  let happyHour: any = {};
  let hero: any = {};
  let about: any = {};
  let gallery: any = {};
  try {
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    happyHour = happyHourSetting ? JSON.parse(happyHourSetting.value) : {};
    hero = heroSetting ? JSON.parse(heroSetting.value) : {};
    about = aboutSetting ? JSON.parse(aboutSetting.value) : {};
    gallery = gallerySetting ? JSON.parse(gallerySetting.value) : {};
  } catch {}

  const formatHours = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (!hours || Object.keys(hours).length === 0) {
      return 'Open Daily';
    }

    // Get today's day name in Mountain Time
    const mtToday = getMountainTimeNow();
    const mtDayName = mtToday.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: 'America/Denver'
    }).toLowerCase();
    const todayDay = days.find(day => dayNames[days.indexOf(day)].toLowerCase() === mtDayName) || days[0];
    const todayHours = hours[todayDay];
    
    if (todayHours) {
      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
      };
      return `Today: ${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
    }
    
    return 'Open Daily';
  };

  return (
    <main id="main-content" className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] scroll-smooth" role="main" aria-label="Main content">
      {/* Hero Section */}
      <section aria-label="Hero section" className="relative min-h-screen md:h-screen flex items-center justify-center overflow-y-auto overflow-x-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/pics/hero.png"
            alt="Monaghan's Bar and Grill"
            fill
            className="object-cover"
            priority
            unoptimized={true}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
        
        <div className="relative z-10 w-full px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto py-12 md:py-16">
          {/* Main Header */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-4 md:mb-6 text-white drop-shadow-2xl">
              {hero.title || "Monaghan's"}
            </h1>
            <p className="text-2xl md:text-3xl lg:text-4xl mb-3 md:mb-4 text-white/90 font-light">
              {hero.tagline || "Bar & Grill"}
            </p>
            <p className="text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 text-white/80 italic">
              {hero.subtitle || "Established 1892 • Denver's Second-Oldest Bar • Minority Woman Owned"}
            </p>
            
            {/* Key Info */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm md:text-base mb-6 md:mb-8">
              {contact.city && (
                <div className="flex items-center gap-2 text-white/90">
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{contact.city}, CO</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-white/90">
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{contact.phone}</span>
                </div>
              )}
              {formatHours() !== 'Open Daily' && (
                <div className="flex items-center gap-2 text-white/90">
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatHours().replace('Today: ', '')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Announcement Banner - Compact if not important */}
          {publishedAnnouncements.length > 0 && (
            <div className="mb-6 md:mb-8 max-w-4xl mx-auto animate-fade-in">
              {publishedAnnouncements.map((announcement) => {
                const announcementWithCTA = announcement as typeof announcement & { ctaText?: string | null; ctaUrl?: string | null };
                const hasCTA = announcementWithCTA.ctaText && announcementWithCTA.ctaUrl;
                const isImportant = announcement.title.toLowerCase() !== 'test' && announcement.title.trim().length > 0;
                
                if (!isImportant) {
                  // Compact banner for less important announcements
                  return (
                    <div key={announcement.id} className={`bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4 ${hasCTA ? 'pb-6' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Announcement</span>
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-white mb-1">{announcement.title}</h2>
                      {announcement.body && (
                        <div 
                          className={`text-sm text-white/90 prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-white/90 prose-p:my-1 ${hasCTA ? 'mb-4' : ''}`}
                          dangerouslySetInnerHTML={{ __html: marked(announcement.body) }}
                        />
                      )}
                      {hasCTA && (
                        <div className="mt-4 flex justify-center">
                          <a
                            href={announcementWithCTA.ctaUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold text-xs rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                          >
                            <span>{announcementWithCTA.ctaText}</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Full banner for important announcements
                return (
                  <div
                    key={announcement.id}
                    className={`relative ${hasCTA ? 'transform hover:scale-[1.01] transition-transform duration-300' : ''}`}
                  >
                    <div className="relative bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-0.5 sm:p-1 rounded-lg shadow-2xl">
                      <div className={`bg-black/90 backdrop-blur-md rounded-md p-4 sm:p-6 md:p-8 ${hasCTA ? 'pb-6 sm:pb-8 md:pb-10' : ''}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-orange-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span className="text-orange-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
                            Announcement
                          </span>
                        </div>
                        
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 drop-shadow-lg">
                          {announcement.title}
                        </h2>
                        
                        {announcement.body && (
                          <div 
                            className={`text-sm sm:text-base text-white/95 prose prose-invert max-w-none prose-headings:text-white prose-p:text-white/95 prose-p:my-2 ${hasCTA ? 'mb-6' : 'mb-4'}`}
                            dangerouslySetInnerHTML={{ __html: marked(announcement.body) }}
                          />
                        )}

                        {hasCTA && (
                          <div className="mt-6 flex justify-center">
                            <a
                              href={announcementWithCTA.ctaUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold text-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                            >
                              <span>{announcementWithCTA.ctaText}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Today's Highlights Section - Dynamic Content */}
          <div className="mb-8 md:mb-12 max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Today&apos;s Highlights</h2>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto"></div>
            </div>

            {/* Dynamic Content Grid - Responsive based on item count */}
            {(() => {
              const itemCount = [todaysFoodSpecial, todaysDrinkSpecial, todaysEvents.length > 0 ? todaysEvents[0] : null].filter(Boolean).length;
              const gridCols = itemCount === 1 
                ? 'grid-cols-1 max-w-2xl mx-auto' 
                : itemCount === 2 
                ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
              const cardPadding = itemCount <= 2 ? 'p-8 md:p-10' : 'p-6 md:p-8';
              return (
                <div className={`grid ${gridCols} gap-4 md:gap-6 mb-6 md:mb-8`}>
              {/* Food Special */}
              {todaysFoodSpecial && (
                <div className={`relative bg-gradient-to-br from-orange-950/95 via-red-950/95 to-orange-950/95 backdrop-blur-md rounded-2xl ${cardPadding} shadow-2xl overflow-hidden animate-fade-in transition-none border border-orange-500/20`}>
                  <div className="absolute inset-0 opacity-0">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-orange-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-400/20 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-orange-500/40 to-red-500/40 rounded-xl backdrop-blur-sm">
                        <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="text-orange-300 text-xs font-bold uppercase tracking-wider">
                        Today&apos;s Food Special
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                      {todaysFoodSpecial.title}
                    </h3>
                    {todaysFoodSpecial.description && (
                      <p className="text-sm md:text-base text-white/90 mb-3 leading-relaxed">
                        {todaysFoodSpecial.description}
                      </p>
                    )}
                    {todaysFoodSpecial.priceNotes && (
                      <div className="inline-block px-4 py-2 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded-lg backdrop-blur-sm mb-3">
                        <p className="text-orange-200 font-bold text-base md:text-lg">
                          {todaysFoodSpecial.priceNotes}
                        </p>
                      </div>
                    )}
                    {todaysFoodSpecial.timeWindow && (
                      <div className="flex items-center gap-2 text-white/70 text-sm mt-4 pt-4 border-t border-white/10">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{todaysFoodSpecial.timeWindow}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Drink Special */}
              {todaysDrinkSpecial && (
                <div className={`group relative bg-gradient-to-br from-blue-950/95 via-indigo-950/95 to-purple-950/95 backdrop-blur-md rounded-2xl ${cardPadding} shadow-2xl overflow-hidden animate-fade-in hover:scale-[1.02] transition-all duration-300 border border-blue-500/20`}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500/40 to-indigo-500/40 rounded-xl backdrop-blur-sm">
                        <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                      <span className="text-blue-300 text-xs font-bold uppercase tracking-wider">
                        Today&apos;s Drink Special
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                      {todaysDrinkSpecial.title}
                    </h3>
                    {todaysDrinkSpecial.description && (
                      <p className="text-sm md:text-base text-white/90 mb-3 leading-relaxed">
                        {todaysDrinkSpecial.description}
                      </p>
                    )}
                    {todaysDrinkSpecial.priceNotes && (
                      <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500/30 to-indigo-500/30 rounded-lg backdrop-blur-sm mb-3">
                        <p className="text-blue-200 font-bold text-base md:text-lg">
                          {todaysDrinkSpecial.priceNotes}
                        </p>
                      </div>
                    )}
                    {todaysDrinkSpecial.timeWindow && (
                      <div className="flex items-center gap-2 text-white/70 text-sm mt-4 pt-4 border-t border-white/10">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{todaysDrinkSpecial.timeWindow}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Today's Event */}
              {todaysEvents.length > 0 && (
                <div className={`group relative bg-gradient-to-br from-purple-950/95 via-pink-950/95 to-purple-950/95 backdrop-blur-md rounded-2xl ${cardPadding} shadow-2xl overflow-hidden animate-fade-in hover:scale-[1.02] transition-all duration-300 border border-purple-500/20`}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-400/20 rounded-full -ml-12 -mb-12 blur-2xl"></div>
                  </div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-purple-500/40 to-pink-500/40 rounded-xl backdrop-blur-sm">
                        <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">
                        Today&apos;s Event
                      </span>
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight flex-1">
                      {todaysEvents[0].title}
                    </h3>
                    
                    {todaysEvents[0].description && (
                      <p className="text-sm md:text-base text-white/90 mb-4 leading-relaxed">
                        {todaysEvents[0].description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 pt-4 mt-auto border-t border-white/10">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-purple-200 font-semibold text-sm md:text-base block">
                          {new Date(todaysEvents[0].startDateTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {todaysEvents[0].endDateTime &&
                            ` - ${new Date(todaysEvents[0].endDateTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </div>
              );
            })()}

            {/* Happy Hour - Permanent Banner Style */}
            {happyHour && happyHour.enabled && (
              <div className="relative bg-gradient-to-r from-green-950/95 via-emerald-950/95 to-green-950/95 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden border border-green-500/30 transition-none">
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
                </div>
                <div className="absolute top-0 right-0 w-72 h-72 bg-green-400/5 rounded-full -mr-36 -mt-36 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                    {/* Left Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-green-500/20 rounded-xl backdrop-blur-sm border border-green-400/30">
                          <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-green-300/90 text-xs font-semibold uppercase tracking-wider block">
                            Always Available
                          </span>
                          <span className="text-green-200 text-lg font-bold">
                            Daily Happy Hour
                          </span>
                        </div>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {happyHour.title || 'Buy One Get One'}
                      </h3>
                      {happyHour.description && (
                        <p className="text-white/90 text-sm md:text-base mb-2 leading-relaxed">
                          {happyHour.description}
                        </p>
                      )}
                      {happyHour.details && (
                        <p className="text-white/70 text-xs md:text-sm mt-2">
                          {happyHour.details}
                        </p>
                      )}
                    </div>
                    
                    {/* Right Time Badge */}
                    {happyHour.times && (
                      <div className="flex-shrink-0">
                        <div className="inline-flex flex-col items-center gap-2 px-6 md:px-8 py-5 md:py-6 bg-green-500/20 backdrop-blur-md rounded-2xl border border-green-400/30 shadow-lg">
                          <svg className="w-7 h-7 md:w-8 md:h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-lg md:text-xl font-bold text-green-200 whitespace-nowrap">
                            {happyHour.times}
                          </span>
                          <span className="text-xs text-green-300/80 font-semibold uppercase tracking-wider">
                            Every Day
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent pointer-events-none"></div>
              </div>
            )}
          </div>
          
          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\D/g, '')}`}
                className="group relative px-8 py-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Us
                </span>
              </a>
            )}
            <Link
              href="/order"
              className="group px-8 py-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Order Online
            </Link>
            <Link
              href="/menu"
              className="group px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full text-lg font-semibold border-2 border-white/30 hover:border-white/50 transition-all hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              View Menu
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* About Section */}
      <section id="about" aria-label="About section" className="py-20 md:py-32 px-4 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 text-white">{about.title || "A Neighborhood Institution"}</h2>
            <div className="w-24 h-1 bg-[var(--color-accent)] mx-auto mb-8"></div>
          </div>
          
          <div className="space-y-6 text-lg md:text-xl text-gray-300 leading-relaxed">
            {about.paragraph1 ? (
              <p>
                {about.paragraph1}
              </p>
            ) : (
              <p>
                Since 1892, Monaghan&apos;s has been the heart of the Sheridan neighborhood—Denver&apos;s second-oldest bar and a true local landmark. For over 130 years, we&apos;ve been where neighbors gather, stories are shared, and traditions are made.
              </p>
            )}
            
            {about.paragraph2Title ? (
              <p className="text-white font-semibold">
                {about.paragraph2Title}
              </p>
            ) : (
              <p className="text-white font-semibold">
                A Woman-Owned Legacy
              </p>
            )}
            
            {about.paragraph2 ? (
              <p>
                {about.paragraph2}
              </p>
            ) : (
              <p>
                After over a decade of dedicated service behind the bar, our owner purchased Monaghan&apos;s, continuing a legacy of community, hospitality, and genuine neighborhood spirit. We&apos;re proud to carry forward the traditions that make this place special.
              </p>
            )}
            
            {about.paragraph3 ? (
              <p>
                {about.paragraph3}
              </p>
            ) : (
              <p>
                From our famous Green Chili to our daily BOGO Happy Hour, from catching the game to enjoying live music, Monaghan&apos;s is where great food, cold drinks, and warm community come together.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Gallery Carousel */}
      <section id="gallery" aria-label="Gallery section" className="py-16 md:py-24 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">{gallery.title || "Inside Monaghan's"}</h2>
          <ImageCarousel />
        </div>
      </section>

      {/* Events Section */}
      <section id="events" aria-label="Events section" className="py-16 md:py-24 px-4 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Upcoming Events</h2>
            <div className="w-24 h-1 bg-purple-500 mx-auto mb-8"></div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 text-lg mb-2">No upcoming events</p>
                <p className="text-gray-500 text-sm">Check back soon for updates!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
                >
                  <h3 className="text-xl font-bold mb-3 text-white">{event.title}</h3>
                  {event.description && (
                    <p className="text-gray-300 mb-4 leading-relaxed text-sm">{event.description}</p>
                  )}
                  
                  <div className="space-y-2 pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">
                        {new Date(event.startDateTime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">
                        {new Date(event.startDateTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {event.endDateTime &&
                          ` - ${new Date(event.endDateTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`}
                      </span>
                    </div>
                    
                    {event.venueArea && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">{event.venueArea}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-6 py-3 border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg transition cursor-pointer"
            >
              View All Events
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
