import Link from 'next/link';
import VerifiedSuccessFlash from './verified-success-flash';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function PrivateDiningNotificationVerifiedPage({ searchParams }: Props) {
  const params = await searchParams;
  const err = params.error;

  if (err === 'expired') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Link expired</h1>
        <p className="mt-3 max-w-md text-gray-600 dark:text-gray-400">
          No action is needed. Private dining lead notifications are now enabled when an admin adds your
          email address.
        </p>
        <Link href="/" className="mt-8 text-[var(--color-accent)] hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (err === 'invalid') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Invalid link</h1>
        <p className="mt-3 max-w-md text-gray-600 dark:text-gray-400">
          This confirmation link is no longer required. If you were added by an admin, your notifications
          are already active.
        </p>
        <Link href="/" className="mt-8 text-[var(--color-accent)] hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return <VerifiedSuccessFlash />;
}
