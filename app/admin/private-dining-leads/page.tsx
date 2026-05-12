import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';
import AdminPageHeader from '@/components/admin-page-header';
import PrivateDiningLeadsTabs from './private-dining-leads-tabs';

export default async function AdminPrivateDiningLeads() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Check if user has admin/owner access
  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessAdmin) {
    redirect('/admin/login');
  }

  const isAdmin = session.user.role === 'admin';

  const leadInclude = {
    notes: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
    },
    contacts: true,
    _count: {
      select: {
        notes: true,
        contacts: true,
      },
    },
  };

  const activeLeads = await prisma.privateDiningLead.findMany({
    where: { hiddenAt: null },
    include: leadInclude,
    orderBy: { createdAt: 'desc' },
  });

  let removedLeads: typeof activeLeads = [];
  if (isAdmin) {
    removedLeads = await prisma.privateDiningLead.findMany({
      where: { hiddenAt: { not: null } },
      include: leadInclude,
      orderBy: { hiddenAt: 'desc' },
    });
  }

  const serializeList = (leads: typeof activeLeads) =>
    leads.map((lead) => ({
      ...lead,
      preferredDate: lead.preferredDate.toISOString(),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      hiddenAt: lead.hiddenAt ? lead.hiddenAt.toISOString() : null,
      notes: lead.notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
      })),
    }));

  const serializedLeads = serializeList(activeLeads);
  const serializedRemoved = isAdmin ? serializeList(removedLeads) : [];

  // Serialize dates to strings for client component

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <AdminPageHeader
        title="Private Dining Leads"
        description="Manage inquiries and convert leads into events"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <PrivateDiningLeadsTabs
            initialLeads={serializedLeads}
            initialRemovedLeads={serializedRemoved}
            userRole={session.user.role}
          />
        </div>
      </div>
    </div>
  );
}

