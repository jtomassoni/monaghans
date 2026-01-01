import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';
import PrivateDiningLeadsList from './leads-list';
import AdminPageHeader from '@/components/admin-page-header';

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

  const leads = await prisma.privateDiningLead.findMany({
    include: {
      notes: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Get most recent note for preview
      },
      contacts: true,
      _count: {
        select: {
          notes: true,
          contacts: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize dates to strings for client component
  const serializedLeads = leads.map(lead => ({
    ...lead,
    preferredDate: lead.preferredDate.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    notes: lead.notes.map(note => ({
      ...note,
      createdAt: note.createdAt.toISOString(),
    })),
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
        title="Private Dining Leads"
        description="Manage inquiries and convert leads into events"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <PrivateDiningLeadsList initialLeads={serializedLeads} />
        </div>
      </div>
    </div>
  );
}

