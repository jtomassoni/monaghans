import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';
import LeadDetailClient from './lead-detail-client';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Check if user has admin/owner access
  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessAdmin) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const lead = await prisma.privateDiningLead.findUnique({
    where: { id },
    include: {
      notes: {
        orderBy: { createdAt: 'desc' },
      },
      contacts: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!lead) {
    redirect('/admin/private-dining-leads');
  }

  return <LeadDetailClient initialLead={lead} />;
}

