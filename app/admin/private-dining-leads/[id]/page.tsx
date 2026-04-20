import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';
import LeadDetailClient from './lead-detail-client';

function isMissingLeadEmailTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('PrivateDiningLeadEmail') ||
    message.includes('private_dining_lead_email') ||
    message.includes('does not exist') ||
    message.includes("Unknown field `emails`") ||
    message.includes("Unknown arg `emails`") ||
    message.includes("Unknown argument `emails`")
  );
}

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
  let lead;
  try {
    lead = await prisma.privateDiningLead.findUnique({
      where: { id },
      include: {
        emails: {
          orderBy: { createdAt: 'asc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        contacts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  } catch (error) {
    if (!isMissingLeadEmailTableError(error)) throw error;
    const fallbackLead = await prisma.privateDiningLead.findUnique({
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
    lead = fallbackLead ? { ...fallbackLead, emails: [] } : null;
  }

  if (!lead) {
    redirect('/admin/private-dining-leads');
  }

  return <LeadDetailClient initialLead={lead} />;
}

