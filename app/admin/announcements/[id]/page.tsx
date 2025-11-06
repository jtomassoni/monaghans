import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AnnouncementForm from '../announcement-form';

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    redirect('/admin/announcements');
  }

  return (
    <AnnouncementForm
      announcement={{
        ...announcement,
        heroImage: announcement.heroImage || '',
        publishAt: announcement.publishAt?.toISOString() || '',
      }}
    />
  );
}

