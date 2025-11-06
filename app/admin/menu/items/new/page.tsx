import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import MenuItemForm from '../../item-form';

export default async function NewItemPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const sections = await prisma.menuSection.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  return <MenuItemForm sections={sections} />;
}

