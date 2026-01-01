import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import PurchaseOrdersList from './purchase-orders-list';
import AdminPageHeader from '@/components/admin-page-header';

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

  type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
    include: {
      supplier: {
        select: {
          id: true;
          name: true;
          displayName: true;
        };
      };
      items: {
        include: {
          product: {
            select: {
              id: true;
              name: true;
              supplierSku: true;
            };
          };
          ingredient: {
            select: {
              id: true;
              name: true;
            };
          };
        };
      };
      _count: {
        select: {
          items: true;
        };
      };
    };
  }>;

  type SupplierSelect = {
    id: string;
    name: string;
    displayName: string | null;
  };

  let orders: PurchaseOrderWithRelations[] = [];
  let suppliers: SupplierSelect[] = [];
  
  try {
    orders = await prisma.purchaseOrder.findMany({
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
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    orders = [];
  }

  try {
    suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    suppliers = [];
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <AdminPageHeader
        title="Purchase Orders"
        description="Manage purchase orders and track supplier deliveries"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <PurchaseOrdersList initialOrders={orders} suppliers={suppliers} />
        </div>
      </div>
    </div>
  );
}
