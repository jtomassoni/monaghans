import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminNav from '@/components/admin-nav';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isLoginPage = headersList.get('x-is-login-page') === 'true';
  
  // If on login page, skip admin layout (let login layout handle it)
  if (isLoginPage) {
    return <>{children}</>;
  }
  
  const session = await getServerSession(authOptions);
  
  // Critical: If no session, redirect immediately
  if (!session) {
    redirect('/admin/login');
  }
  
  // AdminNav should only render when we have a valid authenticated session
  return (
    <div className="h-screen flex bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 dark:from-blue-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-bl from-purple-200/20 dark:from-purple-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-tr from-indigo-200/20 dark:from-indigo-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      <AdminNav
        isSuperadmin={session.user.role === 'superadmin'}
        userName={session.user.name || undefined}
        userEmail={session.user.email || undefined}
      />
      <main className="flex-1 overflow-hidden relative z-0 text-gray-900 dark:text-white">
        {children}
      </main>
    </div>
  );
}

