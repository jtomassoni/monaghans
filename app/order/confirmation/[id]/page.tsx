import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-16 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
            <p className="text-gray-400">Your order has been received</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 mb-6 text-left">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <span className="text-gray-400">Order Number</span>
              <span className="text-xl font-bold text-[var(--color-accent)]">{order.orderNumber}</span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-white font-semibold capitalize">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pickup Time</span>
                <span className="text-white font-semibold">
                  {order.pickupTime 
                    ? new Date(order.pickupTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'ASAP'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-white font-bold text-lg">${order.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h3 className="font-semibold text-white mb-2">Order Items</h3>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-gray-400">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              We&apos;ll send a confirmation email to <strong className="text-white">{order.customerEmail}</strong>
            </p>
            <p className="text-gray-400 text-sm">
              We&apos;ll call you at <strong className="text-white">{order.customerPhone}</strong> when your order is ready for pickup.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href="/menu"
                className="flex-1 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition text-center"
              >
                Place Another Order
              </Link>
              <Link
                href="/"
                className="flex-1 px-6 py-3 border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-semibold rounded-lg transition text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

