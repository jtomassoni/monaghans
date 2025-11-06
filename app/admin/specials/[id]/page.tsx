import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SpecialForm from '../special-form';

export default async function EditSpecialPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const special = await prisma.special.findUnique({
    where: { id },
  });

  if (!special) {
    redirect('/admin/specials-events');
  }

  const appliesOn = typeof special.appliesOn === 'string' ? JSON.parse(special.appliesOn) : special.appliesOn;

  return (
    <SpecialForm
      special={{
        id: special.id,
        title: special.title,
        description: special.description || '',
        priceNotes: special.priceNotes || '',
        type: special.type,
        appliesOn: Array.isArray(appliesOn) ? appliesOn : [],
        timeWindow: special.timeWindow || '',
        startDate: special.startDate?.toISOString().split('T')[0] || '',
        endDate: special.endDate?.toISOString().split('T')[0] || '',
        image: special.image || '',
        isActive: special.isActive,
      }}
    />
  );
}

