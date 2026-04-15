import Link from 'next/link';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function PrivateDiningNotificationVerifiedPage({ searchParams }: Props) {
  const params = await searchParams;
  const err = params.error;

  if (err === 'expired') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Link expired</h1>
        <p className="mt-3 max-w-md text-gray-600 dark:text-gray-400">
          This confirmation link has expired. Ask an admin to save your email again under Private Dining
          Leads → Communications so we can send a new link.
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
          We could not confirm this email. The link may have been copied incorrectly or already used.
        </p>
        <Link href="/" className="mt-8 text-[var(--color-accent)] hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email confirmed</h1>
      <p className="mt-3 max-w-md text-gray-600 dark:text-gray-400">
        You will receive private dining and event rental lead notifications at this address. Check your
        inbox for a short welcome message with a link to the admin app — full inquiry details stay in the
        app.
      </p>
      <Link href="/" className="mt-8 text-[var(--color-accent)] hover:underline">
        Back to home
      </Link>
    </div>
  );
}
