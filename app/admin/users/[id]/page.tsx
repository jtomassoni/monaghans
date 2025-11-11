import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserForm from '../user-form';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Check permissions for user management
  const { getPermissions } = await import('@/lib/permissions');
  const permissions = getPermissions(session.user.role);
  if (!permissions.canManageUsers) {
    redirect('/admin');
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    redirect('/admin/users');
  }

  return <UserForm user={user} currentUserRole={session.user.role} />;
}

