import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import POSIntegrationsClient from './pos-integrations-client';

export default async function POSIntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  return <POSIntegrationsClient />;
}

