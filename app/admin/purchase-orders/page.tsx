import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PurchaseOrdersList from './purchase-orders-list';

export default async function AdminPurchaseOrders({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const params = await searchParams;
  const supplierId = params.supplierId;

  const orders = await prisma.purchaseOrder.findMany({
    where: supplierId ? { supplierId } : undefined,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              supplierSku: true,
            },
          },
          ingredient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { orderDate: 'desc' },
    take: 100,
  });

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      displayName: true,
    },
    orderBy: { name: 'asc' },
  });

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
              Purchase Orders
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Manage purchase orders and track supplier deliveries
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <PurchaseOrdersList initialOrders={orders} suppliers={suppliers} />
        </div>
      </div>
    </div>
  );
}
