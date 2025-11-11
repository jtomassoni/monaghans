import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PrintPreviewClient from './print-preview-client';

export default async function PrintPreviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  return <PrintPreviewClient />;
}

