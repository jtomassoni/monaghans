import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SettingsForm from './settings-form';

export default async function AdminSettings() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const contactSetting = await prisma.setting.findUnique({
    where: { key: 'contact' },
  });
  const hoursSetting = await prisma.setting.findUnique({
    where: { key: 'hours' },
  });
  const mapSetting = await prisma.setting.findUnique({
    where: { key: 'mapEmbed' },
  });

  const happyHourSetting = await prisma.setting.findUnique({
    where: { key: 'happyHour' },
  });

  const socialSetting = await prisma.setting.findUnique({
    where: { key: 'social' },
  });

  let contact: any = {};
  let hours: any = {};
  let mapEmbed: any = {};
  let happyHour: any = {};
  let social: any = {};

  try {
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
    mapEmbed = mapSetting ? JSON.parse(mapSetting.value) : {};
    happyHour = happyHourSetting ? JSON.parse(happyHourSetting.value) : {};
    social = socialSetting ? JSON.parse(socialSetting.value) : {};
  } catch {}

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 pt-16 md:pt-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Manage contact info, hours, and site configuration
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <SettingsForm initialContact={contact} initialHours={hours} initialMapEmbed={mapEmbed} initialHappyHour={happyHour} initialSocial={social} />
        </div>
      </div>
    </div>
  );
}

