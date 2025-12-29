import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SettingsForm from './settings-form';
import Breadcrumbs from '@/components/breadcrumbs';

export default async function AdminSettings() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Get timezone setting
  const timezoneSetting = await prisma.setting.findUnique({
    where: { key: 'timezone' },
  });

  // Get site title setting
  const siteTitleSetting = await prisma.setting.findUnique({
    where: { key: 'siteTitle' },
  });

  // Get contact setting
  const contactSetting = await prisma.setting.findUnique({
    where: { key: 'contact' },
  });

  // Get hours setting
  const hoursSetting = await prisma.setting.findUnique({
    where: { key: 'hours' },
  });

  // Get map setting
  const mapSetting = await prisma.setting.findUnique({
    where: { key: 'mapEmbed' },
  });

  const timezone = timezoneSetting?.value || 'America/Denver';
  const siteTitle = siteTitleSetting?.value || "Monaghan's Dive Bar";

  let contact: any = {};
  let hours: any = {};
  let mapEmbed: any = {};

  try {
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
    mapEmbed = mapSetting ? JSON.parse(mapSetting.value) : {};
  } catch {}

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2 pt-16 md:pt-0 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Company Settings
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs hidden sm:block">
              Configure company-wide settings
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden p-2 sm:p-3 relative z-10">
        <div className="h-full">
          <SettingsForm 
            initialTimezone={timezone} 
            initialSiteTitle={siteTitle}
            initialContact={contact}
            initialHours={hours}
            initialMapEmbed={mapEmbed}
            initialHappyHour={{}}
          />
        </div>
      </div>
    </div>
  );
}

