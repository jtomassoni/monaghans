import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CombinedSettingsForm from './combined-settings-form';
import AdminPageHeader from '@/components/admin-page-header';

export default async function AdminSettings() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch all settings
  const [timezoneSetting, siteTitleSetting, contactSetting, hoursSetting, mapSetting, heroSetting, aboutSetting, gallerySetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'timezone' } }),
    prisma.setting.findUnique({ where: { key: 'siteTitle' } }),
    prisma.setting.findUnique({ where: { key: 'contact' } }),
    prisma.setting.findUnique({ where: { key: 'hours' } }),
    prisma.setting.findUnique({ where: { key: 'mapEmbed' } }),
    prisma.setting.findUnique({ where: { key: 'homepageHero' } }),
    prisma.setting.findUnique({ where: { key: 'homepageAbout' } }),
    prisma.setting.findUnique({ where: { key: 'homepageGallery' } }),
  ]);

  const timezone = timezoneSetting?.value || 'America/Denver';
  const siteTitle = siteTitleSetting?.value || "Monaghan's Dive Bar";

  let contact: any = {};
  let hours: any = {};
  let mapEmbed: any = {};
  let hero: any = {};
  let about: any = {};
  let gallery: any = {};

  try {
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
    mapEmbed = mapSetting ? JSON.parse(mapSetting.value) : {};
    hero = heroSetting ? JSON.parse(heroSetting.value) : {};
    about = aboutSetting ? JSON.parse(aboutSetting.value) : {};
    gallery = gallerySetting ? JSON.parse(gallerySetting.value) : {};
  } catch {}

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <AdminPageHeader
        title="Settings & Homepage"
        description="Configure company settings and homepage content"
      />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden p-4 relative z-10">
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Settings */}
            <CombinedSettingsForm 
              initialTimezone={timezone} 
              initialSiteTitle={siteTitle}
              initialContact={contact}
              initialHours={hours}
              initialMapEmbed={mapEmbed}
              initialHero={hero}
              initialAbout={about}
              initialGallery={gallery}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
