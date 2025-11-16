import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SupplierDetail from './supplier-detail';

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      connections: {
        orderBy: { createdAt: 'desc' },
      },
      products: {
        take: 50,
        orderBy: { name: 'asc' },
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      orders: {
        take: 10,
        orderBy: { orderDate: 'desc' },
        include: {
          items: {
            take: 5,
          },
        },
      },
      _count: {
        select: {
          products: true,
          orders: true,
        },
      },
    },
  });

  if (!supplier) {
    redirect('/admin/suppliers');
  }

  return <SupplierDetail supplier={supplier} />;
}

