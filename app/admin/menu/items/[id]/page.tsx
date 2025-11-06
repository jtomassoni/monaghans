import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import MenuItemForm from '../../item-form';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const item = await prisma.menuItem.findUnique({
    where: { id },
  });

  if (!item) {
    redirect('/admin/menu');
  }

  const sections = await prisma.menuSection.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  const modifiers = item.modifiers ? JSON.parse(item.modifiers) : [];

  return (
    <MenuItemForm
      item={{
        id: item.id,
        sectionId: item.sectionId,
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        priceNotes: item.priceNotes || '',
        modifiers: Array.isArray(modifiers) ? modifiers : [],
        isAvailable: item.isAvailable,
        displayOrder: item.displayOrder,
      }}
      sections={sections}
    />
  );
}

