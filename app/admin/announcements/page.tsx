import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import AdminAnnouncementsList from './announcements-list';
import AnnouncementsHeader from './announcements-header';
import AdminPageHeader from '@/components/admin-page-header';

export default async function AdminAnnouncements() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Transform announcements to match the component's expected types
  const transformedAnnouncements = announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    isPublished: announcement.isPublished,
    publishAt: announcement.publishAt?.toISOString() || null,
    expiresAt: announcement.expiresAt?.toISOString() || undefined,
    heroImage: announcement.heroImage || '',
    crossPostFacebook: announcement.crossPostFacebook || false,
    crossPostInstagram: announcement.crossPostInstagram || false,
    ctaText: announcement.ctaText || undefined,
    ctaUrl: announcement.ctaUrl || undefined,
  }));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <AdminPageHeader
        title="Announcements"
        description="Post updates and news to your website"
        helpFeature="announcements"
        action={<AnnouncementsHeader />}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>}>
            <AdminAnnouncementsList initialAnnouncements={transformedAnnouncements} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

