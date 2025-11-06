import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EventForm from '../event-form';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    redirect('/admin/specials-events');
  }

  const tags = event.tags ? JSON.parse(event.tags) : [];

  return (
    <EventForm
      event={{
        ...event,
        description: event.description || '',
        recurrenceRule: event.recurrenceRule || '',
        startDateTime: event.startDateTime.toISOString(),
        endDateTime: event.endDateTime?.toISOString() || '',
        tags: Array.isArray(tags) ? tags : [],
      }}
    />
  );
}

